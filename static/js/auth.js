/* ========================================
   登录注册模块 auth.js
   ======================================== */

document.addEventListener('DOMContentLoaded', () => {
    const loginTab = document.getElementById('login-tab');
    const registerTab = document.getElementById('register-tab');
    const loginFormEl = document.getElementById('login-form');
    const registerFormEl = document.getElementById('register-form');
    const pwdToggleBtns = document.querySelectorAll('.pwd-toggle');

    // Tab切换
    if (loginTab && registerTab) {
        loginTab.addEventListener('click', () => {
            loginTab.classList.add('active'); registerTab.classList.remove('active');
            loginFormEl.style.display = ''; registerFormEl.style.display = 'none';
        });
        registerTab.addEventListener('click', () => {
            registerTab.classList.add('active'); loginTab.classList.remove('active');
            registerFormEl.style.display = ''; loginFormEl.style.display = 'none';
        });
    }

    // 密码显示隐藏
    pwdToggleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const input = btn.parentElement.querySelector('input');
            const eyeOpen = btn.querySelector('.eye-open');
            const eyeClosed = btn.querySelector('.eye-closed');
            if (input.type === 'password') {
                input.type = 'text';
                if(eyeOpen)eyeOpen.style.display='none';
                if(eyeClosed)eyeClosed.style.display='';
            } else {
                input.type = 'password';
                if(eyeOpen)eyeOpen.style.display='';
                if(eyeClosed)eyeClosed.style.display='none';
            }
        });
    });

    // 登录表单提交
    if (loginFormEl) {
        loginFormEl.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = loginFormEl.querySelector('[name=username]').value.trim();
            const password = loginFormEl.querySelector('[name=password]').value;

            if (!username || !password) {
                UI.Toast.warning('请输入用户名和密码'); return;
            }

            const submitBtn = loginFormEl.querySelector('[type=submit]');
            submitBtn.classList.add('loading'); submitBtn.querySelector('.btn-text').textContent = '登录中...';

            const result = await API.post('/auth/login', { username, password });
            submitBtn.classList.remove('loading'); submitBtn.querySelector('.btn-text').textContent = '登 录';

            if (result && result.success) {
                localStorage.setItem('token', result.data.token);
                localStorage.setItem('user', JSON.stringify(result.data.user));
                // 直接跳转首页，强制改密由 index.html 统一处理
                window.location.href = '/';
            } else if (result) {
                UI.Toast.error(result.message || '登录失败');
            }
        });
    }

    // 注册表单提交
    if (registerFormEl) {
        registerFormEl.addEventListener('submit', async (e) => {
            e.preventDefault();

            const username = registerFormEl.querySelector('[name=username]').value.trim();
            const realName = registerFormEl.querySelector('[name=realName]').value.trim();
            const password = registerFormEl.querySelector('[name=password]').value;
            const confirmPassword = registerFormEl.querySelector('[name=confirmPassword]').value;
            const inviteCode = registerFormEl.querySelector('[name=invitationCode]').value.trim();

            if (!username || !realName || !password || !confirmPassword || !inviteCode) {
                UI.Toast.warning('请填写完整信息'); return;
            }
            if (password !== confirmPassword) {
                UI.Toast.error('两次输入的密码不一致'); return;
            }
            if (password.length < 6) {
                UI.Toast.error('密码长度不能少于6位'); return;
            }

            const submitBtn = registerFormEl.querySelector('[type=submit]');
            submitBtn.classList.add('loading'); submitBtn.querySelector('.btn-text').textContent = '注册中...';

            const result = await API.post('/auth/register', {
                username, real_name: realName, password,
                confirm_password: confirmPassword, invitation_code: inviteCode
            });
            submitBtn.classList.remove('loading'); submitBtn.querySelector('.btn-text').textContent = '注 册';

            if (result && result.success) {
                UI.Toast.success('注册成功，请使用新账号登录');
                loginTab.click();
                registerFormEl.reset();
            } else if (result) {
                UI.Toast.error(result.message || '注册失败');
            }
        });
    }

    // 检查是否已登录（如果有Token且不是强制改密状态）
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
        try {
            const u = JSON.parse(savedUser);
            if (!u.must_change_password) {
                // 已登录，跳转首页
                // 不自动跳转，让用户手动操作
            }
        } catch {}
    }
});

function showForceChangePassword() {
    let overlay = document.getElementById('force-pwd-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'force-pwd-overlay';
        overlay.className = 'force-change-pwd-overlay';
        overlay.innerHTML = `
            <div class="force-change-pwd-dialog">
                <h2 style="font-size:18px;margin-bottom:12px;">首次登录 - 请修改密码</h2>
                <div class="force-banner">⚠️ 您正在使用默认密码，为了安全请务必修改</div>
                <form id="force-pwd-form">
                    <div class="form-group">
                        <label class="form-label required">当前密码</label>
                        <input type="password" name="oldPwd" class="form-input" placeholder="请输入当前密码" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label required">新密码</label>
                        <input type="password" name="newPwd" class="form-input" placeholder="至少6位" required minlength="6" oninput="checkPwdStrength(this.value)">
                        <div class="pwd-strength" id="force-pwd-strength"></div>
                    </div>
                    <div class="form-group">
                        <label class="form-label required">确认新密码</label>
                        <input type="password" name="confirmPwd" class="form-input" placeholder="再次输入新密码" required>
                    </div>
                    <div id="force-pwd-error" class="form-error hidden"></div>
                    <button type="submit" class="btn btn-primary btn-lg" style="width:100%;margin-top:8px;">确认修改并进入系统</button>
                </form>
            </div>
        `;
        document.body.appendChild(overlay);
        overlay.classList.add('show');

        // 提交改密
        document.getElementById('force-pwd-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const oldPwd = e.target.oldPwd.value;
            const newPwd = e.target.newPwd.value;
            const confirmPwd = e.target.confirmPwd.value;
            const errEl = document.getElementById('force-pwd-error');

            if (newPwd !== confirmPwd) { errEl.textContent='两次输入不一致';errEl.classList.remove('hidden'); return; }
            if (newPwd.length < 6) { errEl.textContent='密码长度不足6位';errEl.classList.remove('hidden'); return; }

            errEl.classList.add('hidden');
            const result = await API.put('/auth/change-password', {
                oldPassword: oldPwd, newPassword: newPwd, confirmPassword: confirmPwd
            });

            if (result && result.success) {
                UI.Toast.success('密码修改成功，即将进入系统...');
                setTimeout(() => { window.location.href = '/'; }, 1500);
            } else if (result) {
                errEl.textContent = result.message || '修改失败';
                errEl.classList.remove('hidden');
            }
        });
    } else {
        overlay.classList.add('show');
    }
}

function checkPwdStrength(pwd) {
    const container = document.getElementById('force-pwd-strength');
    if (!container) return;
    let level = 0;
    if (pwd.length >= 6) level++;
    if (pwd.length >= 10) level++;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) level++;
    if (/\d/.test(pwd)) level++;
    if (/[^a-zA-Z\d]/.test(pwd)) level++;

    let bars = '', text = '';
    if (level <= 1) {
        bars='<div class="pwd-strength-bar active-weak"></div><div class="pwd-strength-bar"></div><div class="pwd-strength-bar"></div>'; text='弱';
    } else if (level <= 3) {
        bars='<div class="pwd-strength-bar active-medium"></div><div class="pwd-strength-bar active-medium"></div><div class="pwd-strength-bar"></div>'; text='中';
    } else {
        bars='<div class="pwd-strength-bar active-strong"></div><div class="pwd-strength-bar active-strong"></div><div class="pwd-strength-bar active-strong"></div>'; text='强';
    }
    container.innerHTML = bars + `<div class="pwd-strength-text">强度：${text}</div>`;
}
