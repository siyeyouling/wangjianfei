document.addEventListener('DOMContentLoaded', () => {
    const excelHandler = new ExcelHandler();
    const oldFileInput = document.getElementById('oldFileInput');
    const newFileInput = document.getElementById('newFileInput');
    const oldPreview = document.getElementById('oldFilePreview');
    const newPreview = document.getElementById('newFilePreview');
    const compareButton = document.getElementById('compareButton');

    // 初始状态禁用比对按钮
    compareButton.disabled = true;

    // 检查是否可以启用比对按钮
    function checkCompareButton() {
        compareButton.disabled = !(excelHandler.oldData && excelHandler.newData);
    }

    // 处理旧版本文件上传
    oldFileInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        try {
            console.log('正在处理旧版本文件:', file.name);
            utils.showLoading(oldPreview);
            
            // 清空预览区
            oldPreview.innerHTML = '';
            
            const data = await excelHandler.readFile(file);
            excelHandler.oldData = data;
            
            console.log('旧版本文件数据样例:', data.slice(0, 3)); // 打印前3行数据用于调试
            
            // 确保清除加载状态
            oldPreview.innerHTML = '';
            oldPreview.classList.remove('loading');
            
            if (data && data.length > 0) {
                const table = utils.createTable(data);
                console.log('创建表格成功, 行数:', table.querySelectorAll('tbody tr').length);
                oldPreview.appendChild(table);
            } else {
                oldPreview.innerHTML = '<div class="no-results">无有效数据</div>';
            }
            
            checkCompareButton(); // 检查是否可以启用比对按钮
        } catch (error) {
            console.error('处理旧版本文件错误:', error);
            utils.showError('处理旧版本文件错误: ' + error.message);
            oldPreview.innerHTML = '<div class="error">文件处理失败</div>';
            oldPreview.classList.remove('loading');
            excelHandler.oldData = null;
            checkCompareButton();
        }
    });

    // 处理新版本文件上传
    newFileInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        try {
            console.log('正在处理新版本文件:', file.name);
            utils.showLoading(newPreview);
            
            // 清空预览区
            newPreview.innerHTML = '';
            
            const data = await excelHandler.readFile(file);
            excelHandler.newData = data;
            
            console.log('新版本文件数据样例:', data.slice(0, 3)); // 打印前3行数据用于调试
            
            // 确保清除加载状态
            newPreview.innerHTML = '';
            newPreview.classList.remove('loading');
            
            if (data && data.length > 0) {
                const table = utils.createTable(data);
                console.log('创建表格成功, 行数:', table.querySelectorAll('tbody tr').length);
                newPreview.appendChild(table);
            } else {
                newPreview.innerHTML = '<div class="no-results">无有效数据</div>';
            }
            
            checkCompareButton(); // 检查是否可以启用比对按钮
        } catch (error) {
            console.error('处理新版本文件错误:', error);
            utils.showError('处理新版本文件错误: ' + error.message);
            newPreview.innerHTML = '<div class="error">文件处理失败</div>';
            newPreview.classList.remove('loading');
            excelHandler.newData = null;
            checkCompareButton();
        }
    });

    // 比对按钮点击事件
    compareButton.addEventListener('click', () => {
        if (!excelHandler.oldData || !excelHandler.newData) {
            utils.showError('请先上传新旧版本的Excel文件');
            return;
        }

        try {
            const results = excelHandler.compareData();
            displayResults(results);
        } catch (error) {
            console.error('比对过程错误:', error);
            utils.showError(error.message);
        }
    });
});

/**
 * 显示比对结果
 */
function displayResults(results) {
    const resultArea = document.getElementById('resultArea');
    resultArea.innerHTML = '';
    
    if (!results || results.length === 0) {
        resultArea.innerHTML = '<div class="no-results">没有找到可比对的数据</div>';
        return;
    }
    
    // 创建表格
    const table = createResultTable(results);
    resultArea.appendChild(table);
}

function createResultTable(results) {
    const container = document.createElement('div');

    // 创建统计信息
    const statsDiv = document.createElement('div');
    statsDiv.className = 'result-stats';
    
    // 计算统计数据
    const total = results.length;
    const matches = results.filter(r => r.status === 'match').length;
    const diffs = results.filter(r => r.status === 'diff').length;
    
    statsDiv.innerHTML = `
        <div class="stats-box">
            <div class="stats-title">比对完成</div>
            <div class="stats-details">
                共 <span class="total-count">${total}</span> 项，
                匹配 <span class="match-count">${matches}</span> 项，
                差异 <span class="diff-count">${diffs}</span> 项
            </div>
        </div>
        <div class="legend">
            <div class="legend-item">
                <span class="status-symbol match">✓</span>
                <span>匹配项（在旧配方中找到完全相同的规格）</span>
            </div>
            <div class="legend-item">
                <span class="status-symbol diff">✗</span>
                <span>变更项（旧→新，显示详细变化）</span>
            </div>
        </div>
    `;

    // 创建表格
    const table = document.createElement('table');
    table.className = 'result-table';

    // 创建表头
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const headers = ['状态', '序号/替代', '产地', '等级/品种/挑选方式/烟叶形态', '年份'];
    
    headers.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // 创建表体
    const tbody = document.createElement('tbody');
    results.forEach(result => {
        const row = document.createElement('tr');
        row.className = result.status === 'match' ? 'match-row' : 'diff-row';
        
        // 状态列
        const statusCell = document.createElement('td');
        statusCell.className = 'status-cell ' + result.status;
        statusCell.textContent = result.status === 'match' ? '✓' : '✗';
        row.appendChild(statusCell);

        // 其他列
        ['序号/替代', '产地', '等级/品种/挑选方式/烟叶形态', '年份'].forEach(field => {
            const td = document.createElement('td');
            
            if (field === '序号/替代') {
                // 序号/替代列直接显示新值，不显示变更箭头
                td.textContent = result[field];
            } else if (result.status === 'diff' && result.oldValue && 
                      result.oldValue[field] !== result[field]) {
                // 其他列保持原有的变更箭头显示
                td.innerHTML = `${result.oldValue[field]}<span class="change-arrow">→</span>${result[field]}`;
            } else {
                td.textContent = result[field];
            }
            
            row.appendChild(td);
        });

        tbody.appendChild(row);
    });
    table.appendChild(tbody);

    // 将统计信息和表格添加到容器
    container.appendChild(statsDiv);
    container.appendChild(table);
    
    return container;
} 