const utils = {
    /**
     * 从文本中提取流水号
     * @param {string} text 
     * @returns {string|null}
     */
    extractFlowNumber(text) {
        if (!text) return null;
        const match = String(text).match(/GZ\d{6}-\d+-\d+/);
        return match ? match[0] : null;
    },

    /**
     * 创建预览表格
     * @param {Array} data 
     * @returns {HTMLTableElement}
     */
    createTable(data) {
        if (!data || data.length === 0) {
            const noData = document.createElement('div');
            noData.className = 'no-results';
            noData.textContent = '没有数据';
            return noData;
        }

        const table = document.createElement('table');
        const thead = document.createElement('thead');
        const tbody = document.createElement('tbody');
        
        // 第一行作为表头
        const headerRow = document.createElement('tr');
        // 预览表格列名
        const columnLabels = ['序号/替代', '产地', '等级/品种/挑选方式/烟叶形态', '年份'];
        
        columnLabels.forEach(label => {
            const th = document.createElement('th');
            th.textContent = label;
            headerRow.appendChild(th);
        });
        
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        // 跳过表头行，从数据行开始处理
        let headerSkipped = false;
        const processedRows = new Set(); // 用于记录已处理过的行
        
        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            if (!row || row.length === 0) continue;
            
            // 跳过表头行
            if (!headerSkipped && (String(row[0]).includes('序号') || String(row[1]).includes('序号'))) {
                headerSkipped = true;
                continue;
            }
            
            // 跳过重复的表头或预留行
            if (String(row[0]).includes('序号') || String(row[1]).includes('序号') || 
                String(row[0]).includes('预留') || String(row[1]).includes('预留')) {
                continue;
            }
            
            // 跳过无效行
            if (!this.isValidRow(row)) continue;
            
            // 创建行唯一标识，用于检测重复行
            const rowKey = `${row[1]}-${row[2]}-${row[9]}-${row[14]}`;
            if (processedRows.has(rowKey)) continue; // 跳过重复行
            processedRows.add(rowKey);
            
            const tr = document.createElement('tr');
            
            // 序号/替代
            const tdSeq = document.createElement('td');
            tdSeq.textContent = row[1] || '';
            tr.appendChild(tdSeq);
            
            // 产地
            const tdOrigin = document.createElement('td');
            tdOrigin.textContent = row[2] || '';
            tr.appendChild(tdOrigin);
            
            // 等级/品种/挑选方式/烟叶形态
            const tdSpecs = document.createElement('td');
            tdSpecs.textContent = row[9] || '';
            tr.appendChild(tdSpecs);
            
            // 年份
            const tdYear = document.createElement('td');
            tdYear.textContent = row[14] || '';
            tr.appendChild(tdYear);
            
            tbody.appendChild(tr);
        }
        
        table.appendChild(tbody);
        return table;
    },

    /**
     * 检查是否为有效行
     * @param {Array} row 数据行
     * @returns {Boolean} 是否为有效行
     */
    isValidRow(row) {
        if (!row || !row[1]) return false;
        
        const seq = String(row[1]).trim();
        // 跳过表头和特殊行
        const invalidValues = ['序号', '序号/替代', '牌名', '生效备注', '详细要求', '总计', '备注', '拟制：', '预留'];
        
        return !invalidValues.some(value => seq.includes(value));
    },

    /**
     * 显示加载状态
     * @param {HTMLElement} container 容器元素
     */
    showLoading(container) {
        container.innerHTML = '';
        container.classList.add('loading');
        
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'loading';
        
        const spinner = document.createElement('div');
        spinner.className = 'loading-spinner';
        
        const textDiv = document.createElement('div');
        textDiv.className = 'loading-text';
        
        const title = document.createElement('div');
        title.className = 'loading-title';
        title.textContent = '正在处理文件';
        
        const subtitle = document.createElement('div');
        subtitle.className = 'loading-subtitle';
        subtitle.textContent = '请稍候...';
        
        textDiv.appendChild(title);
        textDiv.appendChild(subtitle);
        
        loadingDiv.appendChild(spinner);
        loadingDiv.appendChild(textDiv);
        
        container.appendChild(loadingDiv);
    },

    /**
     * 显示错误消息
     * @param {String} message 错误信息
     */
    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        
        const iconDiv = document.createElement('div');
        iconDiv.className = 'error-icon';
        iconDiv.innerHTML = '⚠️';
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'error-content';
        
        const titleDiv = document.createElement('div');
        titleDiv.className = 'error-title';
        titleDiv.textContent = '错误';
        
        const textDiv = document.createElement('div');
        textDiv.className = 'error-text';
        textDiv.textContent = message;
        
        contentDiv.appendChild(titleDiv);
        contentDiv.appendChild(textDiv);
        
        errorDiv.appendChild(iconDiv);
        errorDiv.appendChild(contentDiv);
        
        document.body.appendChild(errorDiv);
        
        // 3秒后自动移除错误提示
        setTimeout(() => {
            errorDiv.style.animation = 'slideIn 0.3s ease-out reverse';
            setTimeout(() => {
                document.body.removeChild(errorDiv);
            }, 300);
        }, 3000);
    }
}; 