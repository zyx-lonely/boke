<template>
  <div ref="editorRef" class="vditor-container"></div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import Vditor from 'vditor'
import 'vditor/dist/index.css'

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '请输入内容...' },
  height: { type: Number, default: 400 }
})

const emit = defineEmits(['update:modelValue'])
const editorRef = ref(null)
let vditor = null

onMounted(() => {
  vditor = new Vditor(editorRef.value, {
    value: props.modelValue,
    height: props.height,
    placeholder: props.placeholder,
    toolbar: [
      'emoji', 'headings', 'bold', 'italic', 'strike', 'link', '|',
      'list', 'ordered-list', 'check', 'outdent', 'indent', '|',
      'quote', 'line', 'code', 'inline-code', 'insert-before', 'insert-after', '|',
      'upload', 'table', '|',
      'undo', 'redo', '|',
      'fullscreen', 'edit-mode', { name: 'more' }
    ],
    upload: {
      max: 5 * 1024 * 1024,
      url: '/api/admin/upload',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('adminToken') || localStorage.getItem('token')}`
      },
      filename: name => name.replace(/[^\w.-]/g, '_')
    },
    cache: { enable: false },
    input: (value) => {
      emit('update:modelValue', value)
    }
  })
})

watch(() => props.modelValue, (val) => {
  if (vditor && val !== vditor.getValue()) {
    vditor.setValue(val)
  }
})

onBeforeUnmount(() => {
  if (vditor) {
    vditor.destroy()
    vditor = null
  }
})
</script>

<style scoped>
.vditor-container {
  width: 100%;
}
</style>
