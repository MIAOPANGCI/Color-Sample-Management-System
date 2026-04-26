/* ========================================
   UI基础组件 - Modal/Toast/Confirm/Tabs/Drawer/Loading
   ======================================== */

(function(){
    'use strict';

    // ===== Toast =====
    let toastContainer=null;
    const ensureContainer=()=>{
        if(!toastContainer){
            toastContainer=document.createElement('div');
            toastContainer.className='toast-container';
            document.body.appendChild(toastContainer);
        }
        return toastContainer;
    };

    const Toast={
        icons:{success:'✓',error:'✗',info:'ℹ',warning:'⚠'},
        show(msg,type='info',duration=3000){
            const c=ensureContainer();
            const el=document.createElement('div');
            el.className=`toast toast-${type}`;
            el.dataset.remaining = duration;
            el.innerHTML=`<span class="toast-icon">${this.icons[type]||'ℹ'}</span><span>${msg}</span><span class="toast-timer"><i></i><b>${Math.ceil(duration/1000)}s</b></span>`;
            c.appendChild(el);

            let remaining=duration, paused=false, lastTime=null, rafId=null;

            function tick(ts){
                if(paused){ lastTime=ts; rafId=requestAnimationFrame(tick); return; }
                if(!lastTime) lastTime=ts;
                const delta=ts-lastTime;
                lastTime=ts;
                remaining-=delta;
                if(remaining<=0){ dismiss(); return; }
                el.dataset.remaining=Math.max(0,remaining);
                const bar=el.querySelector('.toast-timer i');
                if(bar) bar.style.transform='scaleX('+Math.max(0,remaining/duration)+')';
                const txt=el.querySelector('.toast-timer b');
                if(txt) txt.textContent=Math.ceil(remaining/1000)+'s';
                rafId=requestAnimationFrame(tick);
            }

            function dismiss(){
                cancelAnimationFrame(rafId);
                el.classList.add('hiding');
                setTimeout(()=>{ try{el.remove()}catch(e){} },250);
            }

            el.onmouseenter=()=>{ paused=true; };
            el.onmouseleave=()=>{ paused=false; };

            rafId=requestAnimationFrame(tick);
        },
        success(m){this.show(m,'success');},
        error(m){this.show(m,'error',4000);},
        info(m){this.show(m,'info');},
        warning(m){this.show(m,'warning',3500);}
    };

    // ===== Modal =====
    const Modal={
        _overlay:null,
        create(options={}){
            const o=document.createElement('div');
            o.className='modal-overlay'+(options.force?' force-modal':'');
            o.innerHTML=`
                <div class="modal ${options.width==='wide'?'wide':options.width==='xwide'?'xwide':options.width==='narrow'?'narrow':''}" ${!['wide','xwide','narrow'].includes(options.width)?`style="width:${options.width}"`:''}>
                    <div class="modal-header">
                        <span class="modal-title">${options.title||'对话框'}</span>
                        ${!options.force?'<button class="modal-close" aria-label="关闭"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>':''}
                    </div>
                    <div class="modal-body">${options.content||''}</div>
                    ${options.footer!==false?`<div class="modal-footer">${options.footerHtml||''}</div>`:''}
                </div>`;
            document.body.appendChild(o);
            this._overlay=o;
            // 关闭按钮
            if(!options.force){
                o.querySelector('.modal-close').onclick=()=>this.close();
            }
            // ESC关闭
            const escHandler=(e)=>{
                if(e.key==='Escape'&&options.force)return;
                if(e.key==='Escape'){e.preventDefault();this.close();}
            };
            document.addEventListener('keydown',escHandler);
            o.dataset.escHandler=true;

            // 点击遮罩关闭
            if(options.closeOnOverlay){
                o.addEventListener('click',(e)=>{if(e.target===o)this.close();});
            }

            requestAnimationFrame(()=>o.classList.add('show'));
            return o;
        },
        show(options){return this.create(options);},
        close(){
            if(this._overlay){
                this._overlay.classList.remove('show');
                setTimeout(()=>{
                    if(this._overlay&&this._overlay.parentNode){
                        this._overlay.remove();
                    }
                    this._overlay=null;
                },250);
            }
        }
    };

    // ===== Confirm =====
    const Confirm={
        show(message,title='确认操作',type='warn'){
            return new Promise((resolve)=>{
                const o=document.createElement('div');
                o.className='confirm-overlay show';
                const iconSvg=type==='danger'
                    ?'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
                    :'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.734 16.5c-.77.833.192 2.5 1.732 2.5z"/></svg>';
                o.innerHTML=`<div class="confirm-box">
                    <div class="confirm-icon ${type}">${iconSvg}</div>
                    <div class="confirm-title">${title}</div>
                    <div class="confirm-message">${message}</div>
                    <div class="confirm-actions">
                        <button class="btn btn-outline" data-action="cancel">取消</button>
                        <button class="btn btn-${type==='danger'?'danger':'primary'}" data-action="confirm">确定</button>
                    </div>
                </div>`;
                document.body.appendChild(o);
                o.querySelectorAll('button').forEach(btn=>{
                    btn.onclick=()=>{
                        const action=btn.dataset.action;
                        o.remove(); resolve(action==='confirm');
                    };
                });
            });
        }
    };

    // ===== TabSwitch =====
    const TabSwitch={init(containerId,options={}){
        const container=typeof containerId==='string'?document.getElementById(containerId):containerId;
        if(!container)return;
        const tabs=container.querySelectorAll('.tab-item');
        const panels=container.querySelectorAll('.tab-panel');

        tabs.forEach((tab,idx)=>{
            tab.onclick=()=>{
                tabs.forEach(t=>t.classList.remove('active')); panels.forEach(p=>p.classList.remove('active'));
                tab.classList.add('active');
                if(panels[idx])panels[idx].classList.add('active');
                if(options.onChange)options.onChange(idx,tab.dataset.tab||idx);
            };
        });

        // 默认激活第一个
        if(tabs.length&&!container.querySelector('.tab-item.active')){
            tabs[0].classList.add('active');
            if(panels[0])panels[0].classList.add('active');
        }
    }};

    // ===== Loading =====
    const Loading={
        show(targetEl,text='加载中...'){
            const el=document.createElement('div');
            el.className='loading-overlay';
            el.innerHTML=`<div><div class="spinner"></div>${text?'<div class="loading-text">'+text+'</div>':''}</div>`;
            targetEl.style.position=targetEl.style.position||'relative';
            targetEl.appendChild(el);
            return el;
        },
        fullscreen(text='加载中...'){
            const el=document.createElement('div');
            el.className='loading-fullscreen';
            el.id='global-loading';
            el.innerHTML=`<div class="spinner"></div><div class="loading-text">${text}</div>`;
            document.body.appendChild(el);
            return el;
        },
        hide(el){
            if(el&&el.parentNode)el.parentNode.removeChild(el);
            else{
                const g=document.getElementById('global-loading');
                if(g)g.parentNode.removeChild(g);
            }
        }
    };

    // ===== Drawer =====
    const Drawer={
        create(options={}){
            const side=options.side||'right';
            const w=options.width||480;
            const o=document.createElement('div');
            o.className='drawer-overlay';
            o.innerHTML=`<div class="drawer drawer-${side}" style="width:${w}px">
                <div class="drawer-header">
                    <span style="font-size:16px;font-weight:600;">${options.title||''}</span>
                    <button class="modal-close" aria-label="关闭">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                </div>
                <div class="drawer-body">${options.content||''}</div>
            </div>`;
            document.body.appendChild(o);
            o.querySelector('.modal-close').onclick=()=>this.close(o);
            if(options.closeOverlay)o.onclick=e=>{if(e.target===o)this.close(o);};
            requestAnimationFrame(()=>o.classList.add('show'));
            return o;
        },
        show(options){return this.create(options);},
        close(o){
            if(o){o.classList.remove('show');setTimeout(()=>o.remove(),350);}
        }
    };

    // 导出
    window.UI = { Toast, Modal, Confirm, TabSwitch, Loading, Drawer };
})();
