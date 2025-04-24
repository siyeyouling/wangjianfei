import * as XLSX from 'xlsx'

export const readExcelFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 })
        resolve(jsonData)
      } catch (error) {
        reject(error)
      }
    }
    
    reader.onerror = (error) => reject(error)
    reader.readAsArrayBuffer(file)
  })
}

export const extractFlowNumber = (text) => {
  const match = text.match(/GZ\d{6}-\d+-\d+/)
  return match ? match[0] : null
}

export const compareExcelData = (oldData, newData) => {
  // 实现比对逻辑
  // 返回比对结果，包含差异标记
} 