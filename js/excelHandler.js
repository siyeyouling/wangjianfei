class ExcelHandler {
    constructor() {
        this.oldData = null;
        this.newData = null;
    }

    /**
     * 读取Excel文件
     * @param {File} file 上传的Excel文件
     * @returns {Promise<Array>} 解析后的数据
     */
    async readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = async (e) => {
                try {
                    console.log('开始解析Excel文件');
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    
                    // 获取第一个工作表
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    console.log('工作表名称:', firstSheetName);
                    
                    // 将工作表转换为JSON
                    let jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
                    console.log('原始数据行数:', jsonData.length);
                    
                    // 过滤空行
                    jsonData = jsonData.filter(row => {
                        return row && row.length > 0 && row.some(cell => cell !== '');
                    });
                    
                    console.log('过滤空行后行数:', jsonData.length);
                    console.log('数据样例:', jsonData.slice(0, 5));
                    
                    resolve(jsonData);
                } catch (error) {
                    console.error('Excel解析错误:', error);
                    reject(new Error('Excel文件解析失败: ' + error.message));
                }
            };

            reader.onerror = () => {
                reject(new Error('文件读取失败'));
            };
            
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * 构建规格字符串
     * @param {Array} row 数据行
     * @returns {String} 规格字符串
     */
    buildSpecsString(row) {
        // 如果等级/品种/挑选方式/烟叶形态在同一个单元格中，直接返回
        return row[9] || '';
    }

    /**
     * 比对数据
     */
    compareData() {
        if (!this.oldData || !this.newData) {
            throw new Error('数据未完全加载');
        }

        console.log('开始比对数据...');

        const results = [];
        const matchedOldIndices = new Set();

        // 遍历新表数据
        for (let i = 0; i < this.newData.length; i++) {
            const newRow = this.newData[i];
            if (!this.isValidRow(newRow)) continue;

            const newSeq = String(newRow[1] || '').trim();
            
            // 如果是主规格（数字序号）
            if (!this.isSubstitute(newSeq)) {
                let mainMatched = false;
                const newMainContent = this.getRowContent(newRow);

                // 在旧表中查找匹配的主规格
                for (let j = 0; j < this.oldData.length; j++) {
                    if (matchedOldIndices.has(j)) continue;

                    const oldRow = this.oldData[j];
                    if (!this.isValidRow(oldRow)) continue;

                    const oldSeq = String(oldRow[1] || '').trim();
                    
                    // 只与旧表中的主规格比对
                    if (!this.isSubstitute(oldSeq)) {
                        const oldMainContent = this.getRowContent(oldRow);
                        
                        // 主规格内容匹配
                        if (this.contentEquals(newMainContent, oldMainContent)) {
                            // 主规格匹配成功
                            results.push(this.createResultRow(newRow, 'match'));
                            matchedOldIndices.add(j);
                            mainMatched = true;

                            // 收集新表中紧随的替代行
                            const newSubstitutes = [];
                            let k = i + 1;
                            while (k < this.newData.length && 
                                   this.isValidRow(this.newData[k]) && 
                                   this.isSubstitute(String(this.newData[k][1] || '').trim())) {
                                newSubstitutes.push(this.newData[k]);
                                k++;
                            }

                            // 收集旧表中对应主规格下的替代行
                            const oldSubstitutes = [];
                            let m = j + 1;
                            while (m < this.oldData.length && 
                                   this.isValidRow(this.oldData[m]) && 
                                   this.isSubstitute(String(this.oldData[m][1] || '').trim())) {
                                oldSubstitutes.push({row: this.oldData[m], index: m});
                                m++;
                            }

                            // 匹配替代行
                            for (const newSub of newSubstitutes) {
                                let subMatched = false;
                                const newSubContent = this.getRowContent(newSub);
                                console.log('新替代行内容:', newSubContent);

                                let bestMatchOldSub = null;
                                let minDiff = Infinity;

                                // 找到最接近的旧替代行
                                for (const {row: oldSub} of oldSubstitutes) {
                                    const oldSubContent = this.getRowContent(oldSub);
                                    const diffCount = this.countDifferences(newSubContent, oldSubContent);
                                    if (diffCount < minDiff) {
                                        minDiff = diffCount;
                                        bestMatchOldSub = oldSub;
                                    }
                                }

                                if (bestMatchOldSub && this.contentEquals(newSubContent, this.getRowContent(bestMatchOldSub))) {
                                    results.push(this.createResultRow(newSub, 'match'));
                                    subMatched = true;
                                    console.log('找到匹配的替代行');
                                } else {
                                    console.log('未找到匹配的替代行');
                                    // 即使未匹配，也传入最接近的旧行数据
                                    results.push(this.createResultRow(newSub, 'diff', '未匹配', bestMatchOldSub));
                                }
                            }

                            // 更新外层循环的索引，跳过已处理的替代行
                            i = k - 1;
                            break;
                        }
                    }
                }

                // 如果主规格未匹配
                if (!mainMatched) {
                    // 找到最接近的旧主规格
                    let bestMatchOldMain = null;
                    let minDiff = Infinity;

                    for (let j = 0; j < this.oldData.length; j++) {
                        const oldRow = this.oldData[j];
                        if (!this.isValidRow(oldRow)) continue;

                        const oldSeq = String(oldRow[1] || '').trim();
                        if (!this.isSubstitute(oldSeq)) {
                            const oldMainContent = this.getRowContent(oldRow);
                            const diffCount = this.countDifferences(newMainContent, oldMainContent);
                            if (diffCount < minDiff) {
                                minDiff = diffCount;
                                bestMatchOldMain = oldRow;
                            }
                        }
                    }

                    results.push(this.createResultRow(newRow, 'diff', '未匹配', bestMatchOldMain));
                    
                    // 将紧随的替代行都标记为未匹配
                    let k = i + 1;
                    while (k < this.newData.length && 
                           this.isValidRow(this.newData[k]) && 
                           this.isSubstitute(String(this.newData[k][1] || '').trim())) {
                        // 为替代行也找到最接近的旧替代行
                        const newSub = this.newData[k];
                        let bestMatchOldSub = null;
                        let minSubDiff = Infinity;

                        // 在所有旧替代行中查找最接近的
                        for (let j = 0; j < this.oldData.length; j++) {
                            const oldRow = this.oldData[j];
                            if (!this.isValidRow(oldRow)) continue;
                            if (!this.isSubstitute(String(oldRow[1] || '').trim())) continue;

                            const diffCount = this.countDifferences(this.getRowContent(newSub), this.getRowContent(oldRow));
                            if (diffCount < minSubDiff) {
                                minSubDiff = diffCount;
                                bestMatchOldSub = oldRow;
                            }
                        }

                        results.push(this.createResultRow(newSub, 'diff', '未匹配', bestMatchOldSub));
                        k++;
                    }
                    i = k - 1;
                }
            }
        }

        return results;
    }

    /**
     * 获取行内容（用于完全匹配）
     */
    getRowContent(row) {
        // 添加调试日志
        console.log('获取行内容:', {
            seq: String(row[1] || '').trim(),
            origin: String(row[2] || '').trim(),
            specs: String(row[9] || '').trim(),
            year: String(row[14] || '').trim()
        });
        
        return {
            origin: String(row[2] || '').trim(), // 产地
            specs: String(row[9] || '').trim(),  // 规格
            year: String(row[14] || '').trim()   // 年份
        };
    }

    /**
     * 判断两行内容是否完全相同
     */
    contentEquals(content1, content2) {
        // 添加调试日志
        console.log('比对内容:', {
            content1: content1,
            content2: content2
        });
        
        const isEqual = content1.origin === content2.origin &&
                        content1.specs === content2.specs &&
                        content1.year === content2.year;
        
        console.log('比对结果:', isEqual);
        
        return isEqual;
    }

    /**
     * 计算两个内容之间的差异数量
     */
    countDifferences(content1, content2) {
        let count = 0;
        if (content1.origin !== content2.origin) count++;
        if (content1.specs !== content2.specs) count++;
        if (content1.year !== content2.year) count++;
        return count;
    }

    /**
     * 将数据按主序列分组
     * @param {Array} data Excel数据
     * @returns {Map} 按主序列分组的数据
     */
    groupDataByMainSequence(data) {
        const groups = new Map();
        let currentMainSeq = null;
        let currentGroup = null;

        for (const row of data) {
            if (!this.isValidRow(row)) continue;
            
            const seq = String(row[1] || '').trim();
            const isSubstitute = this.isSubstitute(seq);

            if (!isSubstitute) {
                // 这是一个主序列行
                currentMainSeq = seq;
                currentGroup = {
                    mainRow: row,
                    substitutes: []
                };
                groups.set(currentMainSeq, currentGroup);
            } else if (currentGroup) {
                // 这是一个替代行，添加到当前组
                currentGroup.substitutes.push(row);
            }
        }

        return groups;
    }

    /**
     * 创建内容键
     */
    createContentKey(row) {
        // 组合关键列创建内容键
        const origin = String(row[2] || '').trim(); // 产地
        const specs = String(row[9] || '').trim();  // 规格
        const year = String(row[14] || '').trim();  // 年份
        
        return `${origin}|${specs}|${year}`;
    }

    /**
     * 判断是否为替代规格
     */
    isSubstitute(seq) {
        return seq.startsWith('替代');
    }

    /**
     * 创建差异结果行
     */
    createDiffResultRow(oldRow, newRow, type = '变更') {
        // 收集变化的字段信息
        const diffInfo = {};
        const changedFields = [];
        
        // 检查产地变化
        const oldOrigin = String(oldRow[2] || '').trim();
        const newOrigin = String(newRow[2] || '').trim();
        if (oldOrigin !== newOrigin) {
            diffInfo["产地"] = {old: oldOrigin, new: newOrigin};
            changedFields.push("产地");
        }
        
        // 检查规格变化
        const oldSpecs = String(oldRow[9] || '').trim();
        const newSpecs = String(newRow[9] || '').trim();
        if (oldSpecs !== newSpecs) {
            diffInfo["等级/品种/挑选方式/烟叶形态"] = {old: oldSpecs, new: newSpecs};
            changedFields.push("等级/品种/挑选方式/烟叶形态");
        }
        
        // 检查年份变化
        const oldYear = String(oldRow[14] || '').trim();
        const newYear = String(newRow[14] || '').trim();
        if (oldYear !== newYear) {
            diffInfo["年份"] = {old: oldYear, new: newYear};
            changedFields.push("年份");
        }
        
        // 创建结果对象
        const result = {
            "序号/替代": newRow[1] || '',
            "产地": newRow[2] || '',
            "等级/品种/挑选方式/烟叶形态": newRow[9] || '',
            "年份": newRow[14] || '',
            status: 'diff',
            diffInfo: diffInfo,
            changeType: type,
            changedFields: changedFields,
            oldRow: oldRow // 保存旧行数据，用于调试和验证
        };
        
        return result;
    }

    /**
     * 创建结果行
     */
    createResultRow(newRow, status, changeType = null, oldRow = null) {
        if (status === 'diff') {
            return {
                "序号/替代": newRow[1] || '',
                "产地": newRow[2] || '',
                "等级/品种/挑选方式/烟叶形态": newRow[9] || '',
                "年份": newRow[14] || '',
                status: 'diff',
                oldValue: oldRow ? {
                    "序号/替代": oldRow[1] || '',
                    "产地": oldRow[2] || '',
                    "等级/品种/挑选方式/烟叶形态": oldRow[9] || '',
                    "年份": oldRow[14] || ''
                } : null
            };
        } else {
            return {
                "序号/替代": newRow[1] || '',
                "产地": newRow[2] || '',
                "等级/品种/挑选方式/烟叶形态": newRow[9] || '',
                "年份": newRow[14] || '',
                status: 'match'
            };
        }
    }

    /**
     * 检查是否为有效行
     */
    isValidRow(row) {
        if (!row || !row[1]) return false;
        
        const seq = String(row[1]).trim();
        // 跳过表头和特殊行
        const invalidValues = ['序号', '序号/替代', '牌名', '生效备注', '详细要求', '总计', '备注', '拟制：', '预留'];
        
        return !invalidValues.some(value => seq.includes(value));
    }

    /**
     * 打印调试信息
     */
    debugInfo(message, data) {
        // 获取调用栈信息
        const stack = new Error().stack;
        const callerLine = stack.split('\n')[2].trim();
        // 提取调用者信息
        const caller = callerLine.match(/at\s(.+?)\s/);
        const callerInfo = caller ? caller[1] : 'unknown';
        
        console.log(`[DEBUG][${callerInfo}] ${message}`, data);
    }
} 