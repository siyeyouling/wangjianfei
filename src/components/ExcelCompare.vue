<template>
  <div class="min-h-screen bg-gray-50">
    <!-- 顶部导航 -->
    <nav class="bg-white shadow-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <h1 class="text-2xl font-semibold text-gray-900">配方比对工具</h1>
      </div>
    </nav>

    <!-- 主要内容区 -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- 文件上传区域 -->
      <div class="grid grid-cols-2 gap-8 mb-8">
        <div class="flex flex-col">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            原始配方
          </label>
          <div 
            class="flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg"
            @drop.prevent="handleDrop($event, 'old')"
            @dragover.prevent
          >
            <div class="space-y-1 text-center">
              <svg class="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              <div class="flex text-sm text-gray-600">
                <label class="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500">
                  <span>上传文件</span>
                  <input 
                    type="file" 
                    class="sr-only" 
                    accept=".xlsx,.xls"
                    @change="handleFileChange($event, 'old')"
                  >
                </label>
              </div>
              <p class="text-xs text-gray-500">仅支持 XLS/XLSX 格式</p>
            </div>
          </div>
        </div>

        <div class="flex flex-col">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            新配方
          </label>
          <div 
            class="flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg"
            @drop.prevent="handleDrop($event, 'new')"
            @dragover.prevent
          >
            <div class="space-y-1 text-center">
              <svg class="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              <div class="flex text-sm text-gray-600">
                <label class="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500">
                  <span>上传文件</span>
                  <input 
                    type="file" 
                    class="sr-only" 
                    accept=".xlsx,.xls"
                    @change="handleFileChange($event, 'new')"
                  >
                </label>
              </div>
              <p class="text-xs text-gray-500">仅支持 XLS/XLSX 格式</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 比对按钮 -->
      <div class="flex justify-center mb-8">
        <button
          @click="compareExcels"
          class="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
          :disabled="!oldFile || !newFile"
        >
          开始比对
        </button>
      </div>

      <!-- 比对结果展示区 -->
      <div v-if="comparisonResult" class="bg-white shadow rounded-lg">
        <div class="px-4 py-5 sm:p-6">
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <!-- 表头 -->
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    序号
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    流水号
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    产地
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    规格信息
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    年份
                  </th>
                </tr>
              </thead>
              <!-- 表格内容 -->
              <tbody class="bg-white divide-y divide-gray-200">
                <!-- 动态渲染比对结果 -->
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import * as XLSX from 'xlsx'

const oldFile = ref(null)
const newFile = ref(null)
const comparisonResult = ref(null)

// 文件上传处理
const handleFileChange = async (event, type) => {
  const file = event.target.files[0]
  if (type === 'old') {
    oldFile.value = file
  } else {
    newFile.value = file
  }
  await processExcelFile(file, type)
}

// 拖拽处理
const handleDrop = async (event, type) => {
  const file = event.dataTransfer.files[0]
  if (file.type.includes('excel') || file.name.match(/\.(xlsx|xls)$/i)) {
    if (type === 'old') {
      oldFile.value = file
    } else {
      newFile.value = file
    }
    await processExcelFile(file, type)
  }
}

// Excel文件处理
const processExcelFile = async (file, type) => {
  // 实现Excel文件读取和解析逻辑
}

// 比对功能
const compareExcels = () => {
  // 实现Excel比对逻辑
}
</script>

<style scoped>
/* 可以添加自定义样式 */
</style> 