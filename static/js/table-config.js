/* ========================================
  通用表格配置模块 - 筛选面板 + 列设置
  table-config.js
  支持页面: seal_sample, color_sample, send_record, scrap_list, disposal_records
  ======================================== */

// 防重复加载：SPA页面切换时脚本可能被多次执行
if (typeof TableConfig !== 'undefined') {
    // console.log('[table-config] already loaded, skip');
} else {
const TableConfig = (function() {
    'use strict';

    // ===== 各页面的字段定义 =====
    const PAGE_DEFS = {
        seal_sample: {
            label: '封样件台账',
            apiPath: '/seal-samples',
            fields: [
                { key: '序号', label: '序号', type: 'text', filterable: false },
                { key: '项目', label: '项目', type: 'text' },
                { key: '封样件名称', label: '封样件名称', type: 'text' },
                { key: '签署人', label: '签署人', type: 'text' },
                { key: '签署人日期', label: '签署人日期', type: 'date' },
                { key: '有效期', label: '有效期', type: 'date' },
                { key: '状态', label: '状态', type: 'select',
                  options: [{v:'normal',l:'正常'},{v:'pending_eval',l:'待评定'},{v:'expired',l:'已过期'},{v:'scrapped',l:'已报废'}] },
                { key: '提醒天数', label: '提醒天数', type: 'number' },
                { key: '备注', label: '备注', type: 'text' }
            ],
            defaultColumns: ['序号','项目','封样件名称','签署人','签署人日期','有效期','状态'],
            allColumns: ['序号','项目','封样件名称','签署人','签署人日期','有效期','状态','提醒天数','备注'],
            // 渲染函数映射
            renderers: {
                '状态'(val, item) {
                    const st = Utils.getStatusTag(val);
                    return `<span class="tag ${st.cls}">${st.text}</span>`;
                },
                '签署人日期'(val) { return Utils.formatDate(val); },
                '有效期'(val) { return Utils.formatDate(val); }
            }
        },

        color_sample: {
            label: '色板台账',
            apiPath: '/color-samples',
            fields: [
                { key: '序号', label: '序号', type: 'text', filterable: false },
                { key: '客户', label: '客户', type: 'text' },
                { key: '适用车型', label: '适用车型', type: 'text' },
                { key: '颜色名称', label: '颜色名称', type: 'text' },
                { key: '样板供应商', label: '样板供应商', type: 'text' },
                { key: '接收数量', label: '接收数量', type: 'number' },
                { key: '当前持有数量', label: '当前持有量', type: 'number' },
                { key: '接收日期', label: '接收日期', type: 'date' },
                { key: '有效期', label: '有效期', type: 'date' },
                { key: '状态', label: '状态', type: 'select',
                  options: [{v:'normal',l:'正常'},{v:'pending_eval',l:'待评定'},{v:'expired',l:'已过期'},{v:'scrapped',l:'已报废'}] },
                { key: '提醒天数', label: '提醒天数', type: 'number' },
                { key: 'ΔE值', label: 'ΔE值', type: 'number' }
            ],
            defaultColumns: ['序号','客户','适用车型','颜色名称','样板供应商','接收数量','当前持有量','接收日期','有效期','状态'],
            allColumns: ['序号','客户','适用车型','颜色名称','样板供应商','接收数量','当前持有量','接收日期','有效期','状态','提醒天数','ΔE摘要','备注'],
            columnAlias: { 'ΔE摘要': 'ΔE值', '当前持有量': '当前持有数量' },  // 显示名→数据字段名
            renderers: {
                '状态'(val) { const s=Utils.getStatusTag(val); return `<span class="tag ${s.cls}">${s.text}</span>`; },
                '接收日期'(val) { return Utils.formatDate(val); },
                '有效期'(val) { return Utils.formatDate(val); },
                '当前持有数量'(val, item) {
                    const q = val || 0;
                    const cls = q <= 5 ? 'qty-low' : '';
                    return `<span class="${cls}">${q}</span>`;
                },
                'ΔE摘要'(val, item) {
                    const de = item['ΔE值'];
                    if(de == null) return '-';
                    const info = Utils.getDeltaEStatus(parseFloat(de));
                    return `<span style="display:inline-flex;align-items:center;gap:4px;">
                        <span style="width:8px;height:8px;border-radius:50%;background:${info.level==='excellent'?getCSSVar('--success'):info.level==='good'?getCSSVar('--warning'):getCSSVar('--danger')}"></span>
                        ${parseFloat(de).toFixed(2)}</span>`;
                }
            }
        },

        send_record: {
            label: '寄出台账',
            apiPath: '/send-records',
            fields: [
                { key: '序号', label: '序号', type: 'text', filterable: false },
                { key: '客户', label: '客户', type: 'text' },
                { key: '颜色名称', label: '颜色名称', type: 'text' },
                { key: '对方单位', label: '对方单位', type: 'text' },
                { key: '寄出数量', label: '寄出数量', type: 'number' },
                { key: '寄出日期', label: '寄出日期', type: 'date' },
                { key: '经手人', label: '经手人', type: 'text' }
            ],
            defaultColumns: ['序号','客户','颜色名称','对方单位','寄出数量','寄出日期','经手人','库存变化'],
            allColumns: ['序号','客户','颜色名称','对方单位','寄出数量','寄出日期','经手人','库存变化','备注'],
            columnAlias: {},
            renderers: {
                '寄出数量'(val) { return `<span style="color:var(--danger);font-weight:600;">${val}</span>`; },
                '寄出日期'(val) { return Utils.formatDate(val); },
                '库存变化'(val, item) { return `<span style="color:var(--success);">↓ ${item['寄出数量']}</span>`; }
            }
        },

        scrap_list: {
            label: '报废记录',
            apiPath: '/scrap',
            fields: [
                { key: '序号', label: '序号', type: 'text', filterable: false },
                { key: 'item_type', label: '类型', type: 'select',
                  options: [{v:'seal',l:'封样件'},{v:'color',l:'色板'}] },
                { key: '名称', label: '名称/编号', type: 'text' },
                { key: '报废原因', label: '报废原因', type: 'text' },
                { key: '报废类型', label: '报废类型', type: 'text' },
                { key: '报废日期', label: '报废日期', type: 'date' },
                { key: '报废审批人', label: '审批人', type: 'text' }
            ],
            defaultColumns: ['序号','类型','名称/编号','报废原因','报废类型','报废日期','审批人'],
            allColumns: ['序号','类型','名称/编号','报废原因','报废类型','报废日期','审批人','备注'],
            columnAlias: { '类型':'item_type', '名称/编号':'名称' },
            renderers: {
                '类型'(val, item) {
                    return item.item_type === 'seal'
                        ? '<span class="tag tag-info">封样件</span>'
                        : '<span class="tag tag-success">色板</span>';
                },
                '报废日期'(val) { return Utils.formatDate(val); }
            }
        },

        disposal_records: {
            label: '处置记录',
            apiPath: '/disposal-records',
            fields: [
                { key: 'record_type', label: '记录类型', type: 'select',
                  options: [{v:'evaluation',l:'评定记录'},{v:'scrap',l:'报废记录'}] },
                { key: 'item_type', label: '对象类型', type: 'select',
                  options: [{v:'seal',l:'封样件'},{v:'color',l:'色板'}] },
                { key: 'item_name', label: '名称', type: 'text' },
                { key: '评定结果', label: '评定结果', type: 'select',
                  options: [{v:'pass',l:'合格续期'},{v:'fail',l:'不合格'}] },
                { key: '报废原因', label: '报废原因', type: 'text' },
                { key: '报废类型', label: '报废类型', type: 'text' },
                { key: '评定人', label: '操作人', type: 'text' },
                { key: '评定日期', label: '日期', type: 'date' }
            ],
            defaultColumns: ['记录类型','对象类型','编号','名称','结果/原因','操作人','日期','详情'],
            allColumns: ['记录类型','对象类型','编号','名称','结果/原因','操作人','日期','详情'],
            columnAlias: {},
            renderers: {}
        }
    };

    // 缓存配置
    var _configs = {};  // { page_key: { columns: [], filters: [] } }

    function getCSSVar(name) {
        return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    }

    // ===== 配置加载/保存 =====

    async function loadConfig(pageKey) {
        // 先尝试从localStorage缓存读取(快速展示)
        const cacheKey = 'tc_' + pageKey;
        try {
            const cached = localStorage.getItem(cacheKey);
            if (cached) _configs[pageKey] = JSON.parse(cached);
        } catch(e) {}
        
        // 始终从后端加载最新配置
        try {
            const [colRes, filtRes] = await Promise.all([
                API.get('/table-configs/' + pageKey + '?type=columns'),
                API.get('/table-configs/' + pageKey + '?type=filter')
            ]);
            
            if (!_configs[pageKey]) _configs[pageKey] = {};
            // 兼容两种后端返回格式：{columns:[...]} 或直接的 [...]
            if (colRes && colRes.success && colRes.data) {
                if (Array.isArray(colRes.data))
                    _configs[pageKey].columns = colRes.data;
                else if (Object.keys(colRes.data).length)
                    _configs[pageKey].columns = colRes.data.columns;
            }
            if (filtRes && filtRes.success && filtRes.data) {
                if (Array.isArray(filtRes.data))
                    _configs[pageKey].filters = filtRes.data;
                else if (Object.keys(filtRes.data).length)
                    _configs[pageKey].filters = filtRes.data.filters;
            }
        } catch(e) {}
        
        // 如果仍无配置，使用默认
        const def = PAGE_DEFS[pageKey];
        if (!_configs[pageKey]) _configs[pageKey] = {};
        if (!_configs[pageKey].columns || !_configs[pageKey].columns.length)
            _configs[pageKey].columns = [...def.defaultColumns];
        if (!_configs[pageKey].filters)
            _configs[pageKey].filters = [];
        
        saveLocalCache(pageKey);
        return _configs[pageKey];
    }

    async function saveConfig(pageKey, configType, data) {
        if (!_configs[pageKey]) _configs[pageKey] = {};
        _configs[pageKey][configType] = data;
        
        // 保存到后端
        try {
            await API.put('/table-configs/' + pageKey, {
                type: configType,
                config: data
            });
        } catch(e) {}
        
        saveLocalCache(pageKey);
    }

    function saveLocalCache(pageKey) {
        const cacheKey = 'tc_' + pageKey;
        try { localStorage.setItem(cacheKey, JSON.stringify(_configs[pageKey])); } catch(e){}
    }

    function getConfig(pageKey) {
        return _configs[pageKey] || {};
    }

    function getVisibleColumns(pageKey) {
        const cfg = getConfig(pageKey);
        const def = PAGE_DEFS[pageKey];
        return cfg.columns && cfg.columns.length ? cfg.columns : def.defaultColumns;
    }

    function getFilters(pageKey) {
        const cfg = getConfig(pageKey);
        return cfg.filters || [];
    }

    // ===== 构建筛选工具栏 =====

    function buildFilterToolbar(pageKey, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const def = PAGE_DEFS[pageKey];
        // 可筛选的字段（排除filterable=false的）
        const filterableFields = def.fields.filter(f => f.filterable !== false);

        container.innerHTML = `
            <div class="tc-filter-bar" id="${pageKey}-filter-bar">
                <div class="tc-filter-rows" id="${pageKey}-filter-rows"></div>
                <div class="tc-filter-actions">
                    <button class="btn btn-outline btn-sm tc-add-filter-btn" onclick="TableConfig.addFilterRow('${pageKey}')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        添加条件
                    </button>
                    <button class="btn btn-primary btn-sm" onclick="TableConfig.doSearch('${pageKey}')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                        搜索
                    </button>
                    <button class="btn btn-ghost btn-sm" onclick="TableConfig.resetFilters('${pageKey}')">重置</button>
                </div>
            </div>
        `;

        // 加载已有筛选条件并渲染
        loadConfig(pageKey).then(() => {
            const filters = getFilters(pageKey);
            if (filters.length > 0) {
                filters.forEach(f => addFilterRowEl(pageKey, f, filterableFields));
            } else {
                // 默认显示一行空筛选
                addFilterRowEl(pageKey, null, filterableFields);
            }
        });
    }

    function addFilterRowEl(pageKey, rowData, fields) {
        const rowsContainer = document.getElementById(pageKey + '-filter-rows');
        if (!rowsContainer) return;

        const rowId = 'filter-row-' + Date.now() + Math.random().toString(36).slice(2,7);
        const fieldOptions = fields.map(f => `<option value="${f.key}" ${rowData && rowData.field === f.key ? 'selected':''}>${f.label}</option>`).join('');

        // 根据字段类型决定操作符和输入框
        function buildOpsAndInput(fieldKey) {
            const field = fields.find(f => f.key === fieldKey) || fields[0];
            const opsHtml = buildOperatorSelect(field.type, rowData ? rowData.op : '');
            const inputHtml = buildValueInput(field, rowData ? rowData.value : '');
            return opsHtml + inputHtml;
        }

        const initialField = rowData ? rowData.field : (fields[0] ? fields[0].key : '');

        const rowEl = document.createElement('div');
        rowEl.className = 'tc-filter-row';
        rowEl.id = rowId;
        rowEl.innerHTML = `
            <select class="form-select tc-fld-select" onchange="TableConfig.onFieldChange(this,'${rowId}','${pageKey}')">${fieldOptions}</select>
            <div class="tc-op-input-wrap">
                ${buildOpsAndInput(initialField)}
            </div>
            <button class="tc-rm-btn" onclick="document.getElementById('${rowId}').remove()" title="删除此条件">&times;</button>
        `;
        rowsContainer.appendChild(rowEl);
    }

    function addFilterRow(pageKey) {
        const def = PAGE_DEFS[pageKey];
        const filterableFields = def.fields.filter(f => f.filterable !== false);
        addFilterRowEl(pageKey, null, filterableFields);
    }

    function onFieldChange(selectEl, rowId, pageKey) {
        const wrap = selectEl.parentElement.querySelector('.tc-op-input-wrap');
        if (!wrap) return;
        const def = PAGE_DEFS[pageKey];
        const fieldKey = selectEl.value;
        const field = def.fields.find(f => f.key === fieldKey) || def.fields[0];
        wrap.innerHTML = buildOperatorSelect(field.type) + buildValueInput(field);
    }

    function buildOperatorSelect(type, selectedOp) {
        const opsMap = {
            text: [['contains','包含'],['equals','等于'],['not_contains','不包含'],['is_empty','为空']],
            date: [['before','早于'],['after','晚于'],['equals','等于']],
            number: [['gt','大于'],['gte','大于等于'],['lt','小于'],['lte','小于等于'],['equals','等于']],
            select: [['equals','等于'],['not_equals','不等于']]
        };
        const ops = opsMap[type] || opsMap.text;
        return `<select class="form-select tc-op-select">${ops.map(o=>`<option value="${o[0]}"${selectedOp===o[0]?' selected':''}>${o[1]}</option>`).join('')}</select>`;
    }

    function buildValueInput(field, value) {
        if (field.type === 'select') {
            const hasVal = (value !== undefined && value !== null && value !== '');
            const opts = (field.options || []).map(o =>
                `<option value="${o.v}"${(hasVal && value===o.v)?' selected':''}>${o.l}</option>`
            ).join('');
            return `<select class="form-input tc-val-input"><option value=""${hasVal?'':' selected'}>全部</option>${opts}</select>`;
        } else if (field.type === 'date') {
            return `<input type="date" class="form-input tc-val-input" value="${value||''}">`;
        } else if (field.type === 'number') {
            return `<input type="number" class="form-input tc-val-input" value="${value||''}" step="any">`;
        }
        return `<input type="text" class="form-input tc-val-input" placeholder="输入关键词..." value="${Utils.escapeHtml(value||'')}">`;
    }

    // 收集当前所有筛选条件
    function collectFilters(pageKey) {
        const rowsContainer = document.getElementById(pageKey + '-filter-rows');
        if (!rowsContainer) return [];

        const filters = [];
        rowsContainer.querySelectorAll('.tc-filter-row').forEach(row => {
            const field = row.querySelector('.tc-fld-select')?.value;
            const op = row.querySelector('.tc-op-select')?.value;
            const value = row.querySelector('.tc-val-input')?.value;
            if (field && op) filters.push({ field, op, value: value || '' });
        });
        return filters;
    }

    // 将筛选条件转为API查询参数
    function filtersToQueryParams(filters, pageKey) {
        const params = {};
        filters.forEach((f, i) => {
            params[`f_field_${i}`] = f.field;
            params[`f_op_${i}`] = f.op;
            params[`f_val_${i}`] = f.value;
        });
        return params;
    }

    function doSearch(pageKey) {
        const filters = collectFilters(pageKey);
        // 同步更新内存，确保回调立即读到最新值
        if (!_configs[pageKey]) _configs[pageKey] = {};
        _configs[pageKey].filters = filters;
        // 异步持久化（不阻塞）
        saveConfig(pageKey, 'filter', filters).catch(()=>{});
        // 触发回调，把最新 filters 传过去
        if (_searchCallbacks[pageKey]) _searchCallbacks[pageKey](filters);
    }

    async function resetFilters(pageKey) {
        const rowsContainer = document.getElementById(pageKey + '-filter-rows');
        if (rowsContainer) rowsContainer.innerHTML = '';
        // 同步更新内存 + 持久化到后端
        if (!_configs[pageKey]) _configs[pageKey] = {};
        _configs[pageKey].filters = [];
        await saveConfig(pageKey, 'filter', []);
        const def = PAGE_DEFS[pageKey];
        addFilterRowEl(pageKey, null, def.fields.filter(f => f.filterable !== false));
        if (_searchCallbacks[pageKey]) _searchCallbacks[pageKey]([]);
        UI.Toast.success('筛选已重置');
    }

    // ===== 列设置弹窗 =====

    function showColumnSettings(pageKey) {
        const def = PAGE_DEFS[pageKey];

        loadConfig(pageKey).then(() => {
            const visibleCols = getVisibleColumns(pageKey);

            const checkboxes = def.allColumns.map(col => {
                const checked = visibleCols.includes(col) ? 'checked' : '';
                // 操作列不可取消勾选（如果有的话）
                const isRequired = def.defaultColumns.includes(col);
                return `
                    <label class="tc-col-item ${isRequired ? 'required' : ''}">
                        <input type="checkbox" value="${col}" ${checked} ${isRequired ? 'data-required="true"' : ''}>
                        <span>${col}</span>
                        ${isRequired ? '<small>默认</small>' : ''}
                    </label>`;
            }).join('');

            UI.Modal.show({
                title: def.label + ' - 列设置',
                width: '420px',
                content: `
                    <div class="tc-col-settings">
                        <p class="tc-col-hint">勾选要在列表中显示的列。带<span class="tag tag-default" style="font-size:10px;padding:1px 6px;">默认</span>标记的建议始终保留。</p>
                        <div class="tc-col-list">${checkboxes}</div>
                    </div>
                `,
                footerHtml: `
                    <button class="btn btn-outline" onclick="UI.Modal.close()">取消</button>
                    <button class="btn btn-primary" onclick="TableConfig.applyColumnSettings('${pageKey}')">应用</button>`
            });

            // 绑定事件：至少保留一个必选列
            requestAnimationFrame(() => {
                document.querySelectorAll('.modal-overlay .tc-col-item input[type=checkbox]').forEach(cb => {
                    cb.addEventListener('change', function() {
                        const checked = document.querySelectorAll('.modal-overlay .tc-col-item input:checked');
                        if (checked.length === 0) this.checked = true;
                    });
                });
            });
        });
    }

    // showColumnSettings already defined as local function above

    function applyColumnSettings(pageKey) {
        const checked = Array.from(
            document.querySelectorAll('.modal-overlay .tc-col-item input:checked')
        ).map(el => el.value);

        if (checked.length === 0) {
            UI.Toast.warning('至少需要保留一列'); return;
        }

        saveConfig(pageKey, 'columns', checked);
        UI.Modal.close();
        UI.Toast.success('列设置已保存');

        if (_columnChangeCallbacks[pageKey]) _columnChangeCallbacks[pageKey](checked);
    }

    // ===== 动态表头生成 =====

    function generateThead(pageKey, extraCol) {
        const visibleCols = getVisibleColumns(pageKey);
        let html = '<tr>';
        visibleCols.forEach(col => html += `<th>${col}</th>`);
        if (extraCol !== false) html += '<th>操作</th>';
        html += '</tr>';
        return { html, colCount: visibleCols.length + (extraCol !== false ? 1 : 0), columns: visibleCols };
    }

    // 动态单元格渲染 - 核心方法
    function renderCell(pageKey, columnName, item) {
        const def = PAGE_DEFS[pageKey];
        // 处理列别名（显示名 → 数据字段名）
        const dataKey = def.columnAlias ? (def.columnAlias[columnName] || columnName) : columnName;
        const val = item[dataKey];

        // 使用自定义渲染器
        if (def.renderers && def.renderers[columnName])
            return def.renderers[columnName](val, item);

        // 默认渲染
        if (val === null || val === undefined) return '-';
        return Utils.escapeHtml(String(val));
    }

    // ===== 工具栏按钮生成 =====

    function buildToolbarButtons(pageKey) {
        return `
            <button class="btn btn-outline btn-sm" onclick="TableConfig.showColumnSettings('${pageKey}')" title="列设置">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/>
                </svg>
                列设置
            </button>
        `;
    }

    // ===== 回调注册 =====
    var _searchCallbacks = {};
    var _columnChangeCallbacks = {};

    function onSearch(pageKey, callback) {
        _searchCallbacks[pageKey] = callback;
    }

    function onColumnChange(pageKey, callback) {
        _columnChangeCallbacks[pageKey] = callback;
    }

    // ===== 获取定义 =====
    function getPageDef(pageKey) {
        return PAGE_DEFS[pageKey] || null;
    }

    // Public API
    return {
        init: loadConfig,
        getPageDef,
        getConfig,
        getVisibleColumns,
        getFilters,
        collectFilters,
        filtersToQueryParams,
        buildFilterToolbar,
        buildToolbarButtons,
        generateThead,
        renderCell,
        showColumnSettings,
        applyColumnSettings,
        doSearch,
        resetFilters,
        addFilterRow,
        onFieldChange,
        onSearch,
        onColumnChange,
        saveConfig
    };
})();

window.TableConfig = TableConfig;
} // end else (防重复加载守卫)
