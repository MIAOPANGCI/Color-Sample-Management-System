/* ========================================
   系统设置页 system-settings.js (ΔE阈值配置)
   ======================================== */
var _settingsData={};

async function loadSystemSettings(){
    const r=await API.get('/admin/settings');
    if(!r||!r.success)return;
    _settingsData=r.data||{};
    
    // 填充表单
    const excellentEl=document.getElementById('setting-excellent');
    const goodEl=document.getElementById('setting-good');
    const warningEl=document.getElementById('setting-warning');
    
    if(excellentEl&&_settingsData.delta_e_excellent)excellentEl.value=_settingsData.delta_e_excellent.value;
    if(goodEl&&_settingsData.delta_e_good)goodEl.value=_settingsData.delta_e_good.value;
    if(warningEl&&_settingsData.delta_e_warning)warningEl.value=_settingsData.delta_e_warning.value;
    
    updateSettingsPreview();
}

function updateSettingsPreview(){
    const exc=parseFloat(document.getElementById('setting-excellent')?.value)||1.0;
    const good=parseFloat(document.getElementById('setting-good')?.value)||2.0;
    const warn=parseFloat(document.getElementById('setting-warning')?.value)||999.0;
    
    const previewArea=document.getElementById('settings-preview-area');
    if(previewArea){
        const testVals=[0.5,1.5,3.0];
        previewArea.innerHTML=testVals.map(v=>{
            const info=Utils.getDeltaEStatus(v,{excellent:exc,good:good,warning:warn});
            const colorStyle=info.level==='excellent'?`color:#007a52;background:#e6f7ef`:info.level==='good'?`color:#b35400;background:#fff7e6`:`color:#b33a44;background:#fef2f2`;
            return `<div class="preview-item">
                <span class="preview-deltae">${v.toFixed(1)}</span>
                <span class="tag" style="${colorStyle};border:none;padding:3px 14px;border-radius:12px;">${info.label}</span>
                <small style="color:var(--text-muted)">ΔE=${v} ${v<exc?`<${exc}`:(v<good?`${exc}≤${v}<${good}`:`≥${good}`)}</small>
            </div>`;
        }).join('');
    }

    // 更新阈值参考文本
    const threshText=document.getElementById('thresholds-ref-text');
    if(threshText){
        threshText.textContent=`当前阈值: 优秀<${exc} / 合格${exc}-${good} / 关注≥${good}`;
    }
}

(function initSettings(){
    const fn=function(){
        ['setting-excellent','setting-good','setting-warning'].forEach(id=>{document.getElementById(id)?.addEventListener('input',updateSettingsPreview);});
        document.getElementById('save-settings-btn')?.addEventListener('click',async()=>{
            var exc=document.getElementById('setting-excellent').value,good=document.getElementById('setting-good').value,warn=document.getElementById('setting-warning').value;
            if(!exc||!good||!warn){UI.Toast.warning('请填写完整的阈值');return;}
            if(parseFloat(exc)>=parseFloat(good)){UI.Toast.error('优秀阈值必须小于合格阈值');return;}
            if(parseFloat(good)>=parseFloat(warn)){UI.Toast.error('合格阈值必须小于需关注阈值');return;}
            var r=await API.put('/admin/settings',{settings:[{key:'delta_e_excellent',value:exc},{key:'delta_e_good',value:good},{key:'delta_e_warning',value:warn}]});
            if(r&&r.success){UI.Toast.success('系统设置已保存，立即生效');}else if(r)UI.Toast.error(r.message);
        });
        document.getElementById('reset-settings-btn')?.addEventListener('click',()=>{document.getElementById('setting-excellent').value='1.0';document.getElementById('setting-good').value='2.0';document.getElementById('setting-warning').value='999.0';updateSettingsPreview();});
        loadSystemSettings();
    };
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',fn); else fn();
})();
