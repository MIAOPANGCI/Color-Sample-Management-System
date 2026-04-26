/* ========================================
   修改密码模块 password-change.js
   支持强制改密(全屏遮罩) 和 自主改密(Dialog)
   ======================================== */

window.showChangePasswordDialog=function(mode='dialog'){
    const isForce=mode==='force';
    const bannerHtml=isForce?'<div class="force-banner">⚠️ 您正在使用默认密码，为了账户安全请务必修改密码</div>':'';
    
    const overlayClass=isForce?'force-change-pwd-overlay show':'modal-overlay show';
    
    let container=document.getElementById('pwd-dialog-container');
    if(container)container.remove();
    
    container=document.createElement('div');
    container.id='pwd-dialog-container';
    container.className=overlayClass;
    container.innerHTML=`
        <div class="${isForce?'force-change-pwd-dialog':'modal narrow'}">
            ${isForce?'':`<div class="modal-header"><span class="modal-title">修改密码</span><button class="modal-close" aria-label="关闭" onclick="closeChangePwd()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button></div>`}
            ${isForce?`<h2 style="font-size:17px;margin-bottom:4px;">修改密码</h2>`:''}
            ${bannerHtml}
            <div style="padding:${isForce?'0':'0 24px'};">
                <form id="change-pwd-form" style="${isForce?'':'padding:0 24px 24px;'}">
                    <div class="form-group">
                        <label class="form-label required">当前密码</label>
                        <div class="input-with-icon">
                            <input type="password" name="oldPwd" class="form-input" placeholder="请输入当前密码" required>
                            <button type="button" class="input-icon-toggle pwd-toggle" aria-label="显示密码">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>
                            </button>
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label required">新密码</label>
                        <div class="input-with-icon">
                            <input type="password" name="newPwd" class="form-input" placeholder="至少6位" required minlength="6" oninput="checkCPwdStrength(this.value)">
                            <button type="button" class="input-icon-toggle pwd-toggle" aria-label="显示密码">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>
                            </button>
                        </div>
                        <div class="pwd-strength" id="cpwd-strength"></div>
                    </div>
                    <div class="form-group">
                        <label class="form-label required">确认新密码</label>
                        <input type="password" name="confirmPwd" class="form-input" placeholder="再次输入新密码" required>
                    </div>
                    <div id="cpwd-error" class="form-error hidden"></div>
                    <button type="submit" class="btn btn-primary btn-lg" style="width:100%;margin-top:8px;" id="cpwd-submit-btn">确认修改</button>
                </form>
            </div>
        </div>`;
    
    document.body.appendChild(container);
    
    // 密码toggle
    container.querySelectorAll('.pwd-toggle').forEach(btn=>{
        btn.addEventListener('click',()=>{
            const input=btn.parentElement.querySelector('input');
            input.type=input.type==='password'?'text':'password';
        });
    });
    
    // 提交
    document.getElementById('change-pwd-form').addEventListener('submit',async(e)=>{
        e.preventDefault();
        const oldPwd=e.target.oldPwd.value;
        const newPwd=e.target.newPwd.value;
        const confirmPwd=e.target.confirmPwd.value;
        const errEl=document.getElementById('cpwd-error');

        if(newPwd!==confirmPwd){errEl.textContent='两次输入的新密码不一致';errEl.classList.remove('hidden');return;}
        if(newPwd.length<6){errEl.textContent='新密码长度不能少于6位';errEl.classList.remove('hidden');return;}
        errEl.classList.add('hidden');

        const submitBtn=document.getElementById('cpwd-submit-btn');
        submitBtn.disabled=true;submitBtn.textContent='提交中...';

        const r=await API.put('/auth/change-password',{
            oldPassword:oldPwd,newPassword:newPwd,confirmPassword:confirmPwd
        });
        
        submitBtn.disabled=false;submitBtn.textContent='确认修改';
        if(r&&r.success){
            UI.Toast.success('密码修改成功，请重新登录...');
            setTimeout(()=>{
                localStorage.removeItem('token');localStorage.removeItem('user');
                window.location.href='/login';
            },1500);
        }else if(r){
            errEl.textContent=r.message||'修改失败';errEl.classList.remove('hidden');
        }
    });
};

window.closeChangePwd=function(){
    const el=document.getElementById('pwd-dialog-container');
    if(el)el.remove();
};

// 密码强度检查(复用)
window.checkCPwdStrength=function(pwd){
    const c=document.getElementById('cpwd-strength');
    if(!c)return;
    let l=0;if(pwd.length>=6)l++;if(pwd.length>=10)l++;if(/[A-Z]/.test(pwd)&&/[a-z]/.test(pwd))l++;
    if(/\d/.test(pwd))l++;if(/[^a-zA-Z\d]/.test(pwd))l++;
    let bars='',txt='';
    if(l<=1){bars='<div class="pwd-strength-bar active-weak"></div><div></div><div></div>';txt='弱';}
    else if(l<=3){bars='<div class="pwd-strength-bar active-medium"></div><div class="pwd-strength-bar active-medium"></div><div></div>';txt='中';}
    else{bars='<div class="pwd-strength-bar active-strong"></div><div></div><div></div><div></div>';txt='强';}
    c.innerHTML=bars+`<div class="pwd-strength-text">强度：${txt}</div>`;
};
