/* ========================================
   管理后台 admin-management.js
   用户管理 + 邀请码管理 + Tab切换
   ======================================== */

// 加载用户列表
async function loadAdminUsers(){
    const search=document.getElementById('admin-user-search')?.value||'';
    const r=await API.get('/admin/users',{search});
    if(!r||!r.success)return;
    
    const tb=document.getElementById('admin-users-tbody');
    if(!tb)return;
    if(!r.data.length){tb.innerHTML='<tr><td colspan="9" class="empty-state"><p>暂无用户</p></td></tr>';return;}
    
    tb.innerHTML=r.data.map(u=>{
        const roleTag=u.is_admin?'<span class="tag tag-admin">管理员</span>':'<span class="tag tag-default">用户</span>';
        const statusTag=u.is_active
            ?'<span class="tag tag-success">正常</span>'
            :'<span class="tag tag-banned">已禁用</span>';
        const codeDisplay=u.code?`${u.code.substring(0,8)}...${u.code.slice(-4)}`:'-';
        // 在线状态
        const onlineTag=u.is_online
            ?'<span class="tag tag-success" style="animation:pulse 2s infinite;">● 在线</span>'
            :'<span class="tag tag-muted" style="color:var(--text-muted);border-color:var(--border);">○ 离线</span>';

        return`<tr data-id="${u.id}" data-is-admin="${u.is_admin}">
            <td><div class="user-avatar" style="width:32px;height:32px;font-size:12px;background:${getAvatarColor(u.username)};position:relative;">${(u.real_name||u.username).charAt(0)}${u.is_online?'<span style="position:absolute;top:-2px;right:-2px;width:10px;height:10px;border-radius:50%;background:#00A870;border:2px solid white;"></span>':''}</div></td>
            <td>${Utils.escapeHtml(u.username)}</td><td>${Utils.escapeHtml(u.real_name||'-')}</td>
            <td>${roleTag}</td><td>${statusTag}</td>
            <td>${onlineTag}</td>
            <td>${Utils.formatDateTime(u.created_at)}</td><td style="font-family:monospace;font-size:12px;color:var(--text-muted);">${codeDisplay}</td>
            <td class="actions-cell">
                <div class="switch-wrapper" onclick="toggleUserStatus(${u.id},${u.is_active})">
                    <div class="switch ${u.is_active?'on':''}"><div class="switch-knob"></div></div>
                </div>
                ${u.id!==JSON.parse(localStorage.getItem('user')||'{}').id&&!u.is_admin?
                `<a href="#" class="btn-link danger" onclick="deleteAdminUser(${u.id},'${escapeAttr(u.username)}')">删除</a>`:''}
            </td>
        </tr>`;
    }).join('');
}

function getAvatarColor(name){
    const colors=['#0052D9','#00A870','#E74600','#E34D59','#059BE9','#8B5CF6','#EC4899'];
    let hash=0;for(let i=0;i<name.length;i++){hash=name.charCodeAt(i)+((hash<<5)-hash);}
    return colors[Math.abs(hash)%colors.length];
}
function escapeAttr(s){return(s||'').replace(/'/g,"\\'");}

window.toggleUserStatus=async(userId,currentActive)=>{
    const newActive=currentActive?0:1;
    const r=await API.put(`/admin/users/${userId}/status`,{isActive:!!newActive});
    if(r&&r.success){UI.Toast.success(r.message);loadAdminUsers();}
    else if(r)UI.Toast.error(r.message);
};

window.deleteAdminUser=async(usernameId,uname)=>{
    const ok=await UI.Confirm.show(`确定注销用户 "${uname}"？此操作不可恢复。`,`注销用户 - ${uname}`,'danger');
    if(ok){
        const r=await API.delete(`/admin/users/${usernameId}`);
        if(r&&r.success){UI.Toast.success('用户已注销');loadAdminUsers();}
        else if(r)UI.Toast.error(r.message);}
};

// 邀请码管理
async function loadInvitations(){
    const r=await API.get('/admin/invitations');
    if(!r||!r.success)return;

    const tb=document.getElementById('invitations-tbody');
    if(!tb)return;
    const list=r.data||[];
    if(!list.length){tb.innerHTML='<tr><td colspan="10" class="empty-state"><p>暂无邀请码</p></td></tr>';return;}
    
    tb.innerHTML=r.data.map(ic=>{
        const statusTag=ic.is_active?'<span class="tag tag-success">启用</span>':'<span class="tag tag-banned">停用</span>';
        const remain=ic.max_uses-(ic.used_count||0);
        const remainCls=remain<=0?'color:var(--danger);font-weight:bold;' :(remain<=2?'color:var(--warning);font-weight:600;' :'');
        return`<tr data-id="${ic.id}">
            <td style="font-family:monospace;font-size:13px;">
                ${ic.code}<a href="#" class="btn-link btn-sm" onclick="event.stopPropagation();Utils.copyToClipboard('${ic.code}')" style="margin-left:6px;">复制</a>
            </td>
            <td>${Utils.escapeHtml(ic.note||'-')}</td>
            <td>${ic.max_uses}</td><td>${ic.used_count||0}</td>
            <td style="${remainCls}">${remain}</td>
            <td>${ic.expires_at?Utils.formatDate(ic.expires_at):'<span class="text-muted">永不过期</span>'}</td>
            <td>${statusTag}</td>
            <td>${Utils.formatDateTime(ic.created_at)}</td>
            <td class="actions-cell">
                <div class="switch-wrapper" onclick="toggleInviteStatus(${ic.id},${ic.is_active})">
                    <div class="switch ${ic.is_active?'on':''}"><div class="switch-knob"></div></div>
                </div>
                <a href="#" class="btn-link danger" onclick="deleteInviteCode(${ic.id})">删除</a>
            </td>
        </tr>`;
    }).join('');
}

window.toggleInviteStatus=async(codeId,currentActive)=>{
    const r=await API.put(`/admin/invitations/${codeId}`,{isActive:!currentActive});
    if(r&&r.success){UI.Toast.success(r.message);loadInvitations();}
    else if(r)UI.Toast.error(r.message);
};
window.deleteInviteCode=async(codeId)=>{
    const ok=await UI.Confirm.show('确定删除此邀请码？','确认删除','danger');
    if(ok){const r=await API.delete(`/admin/invitations/${codeId}`);if(r&&r.success){UI.Toast.success('已删除');loadInvitations();}else if(r)UI.Toast.error(r.message||'删除失败');}
};

// 生成新邀请码
window.openGenerateInviteDialog=()=>{
    UI.Modal.show({title:'生成新邀请码',
        content:`<form id="invite-form">
            <div class="form-group"><label class="form-label">备注说明</label><input type="text" name="note" class="form-input" placeholder="用途说明(可选)"></div>
            <div class="form-group"><label class="form-label">最大使用次数</label><input type="number" name="maxUses" class="form-input" value="1" min="1" max="100"></div>
            <div class="form-group"><label class="form-label">过期时间</label><input type="date" name="expiresAt" class="form-input" placeholder="不填则永不过期"></div>
        </form>`,
        footerHtml:`<button class="btn btn-outline" onclick="UI.Modal.close()">取消</button>
                    <button class="btn btn-primary" id="gen-invite-btn" onclick="generateNewInviteCode()">生成邀请码</button>`
    });
};

window.generateNewInviteCode=async()=>{
    const f=document.getElementById('invite-form');
    const note=f.querySelector('[name=note]')?.value||'';
    const maxUses=parseInt(f.querySelector('[name=maxUses]')?.value)||1;
    const expDate=f.querySelector('[name=expiresAt]')?.value||'';
    
    const r=await API.post('/admin/invitations',{note,max_uses:maxUses,expiresAt:expDate});
    if(r&&r.success){
        // 显示生成的码
        const btn=document.getElementById('gen-invite-btn');
        btn.textContent='已生成!';
        btn.disabled=true;
        f.innerHTML=`<div style="text-align:center;padding:20px 0;">
            <p style="font-size:13px;color:var(--text-secondary);margin-bottom:12px;">邀请码已生成，请保存：</p>
            <div class="invite-code-display">${r.data.code}</div>
            <button class="btn btn-sm btn-outline" style="margin-top:16px;" onclick="Utils.copyToClipboard('${r.data.code}')">复制到剪贴板</button>
        </div>`;
        loadInvitations();
    }else if(r)UI.Toast.error(r.message||'生成失败');
};

(function initAdmin(){
    const fn=function(){
        document.getElementById('admin-user-search-btn')?.addEventListener('click',()=>loadAdminUsers());
        document.getElementById('admin-user-search')?.addEventListener('keydown',e=>{if(e.key==='Enter')loadAdminUsers();});
        UI.TabSwitch.init('admin-tabs',{onChange:(idx,tab)=>{if(idx===0)loadAdminUsers();else if(idx===1)loadInvitations();else if(idx===2)loadSystemSettings();}});
        setTimeout(()=>{loadAdminUsers();},100);
    };
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',fn); else fn();
})();
