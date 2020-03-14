<template>
  <el-dialog
    :visible.sync="dialogVisible"
    :destroy-on-close="destroyOnClose"
    :close-on-click-modal="closeOnClickModal"
  >
    <el-form ref="form" :model="collection" label-position="top">
      <el-form-item label="文件名称（英文）">
        <el-input v-model="collection.name"></el-input>
      </el-form-item>
      <el-form-item label="文件显示名（中文）">
        <el-input v-model="collection.title"></el-input>
      </el-form-item>
      <el-form-item label="文件列定义">
        <el-select
          v-model="collection.schema_id"
          clearable
          placeholder="请选择"
        >
          <el-option
            v-for="item in schemas"
            :key="item._id"
            :label="item.title"
            :value="item._id"
          >
          </el-option>
        </el-select>
      </el-form-item>
      <el-form-item label="说明">
        <el-input type="textarea" v-model="collection.description"></el-input>
      </el-form-item>
      <el-button type="text" v-if="false" @click="advancedToggle = !advancedToggle">高 级 <i :class="[advancedToggle ?'el-icon-caret-top':'el-icon-caret-bottom']"></i></el-button>
      <div v-if="collection.schema_id&&false" >
        <div>设定默认值</div>
        <tms-el-json-doc :schema="collection.schema.body"></tms-el-json-doc>
      </div>
    </el-form>
    <div slot="footer" class="dialog-footer">
      <el-button type="primary" @click="onSubmit">提交</el-button>
      <el-button @click="dialogVisible = false">取消</el-button>
    </div>
  </el-dialog>
</template>
<script>
import Vue from 'vue'
import { ElJsonDoc as TmsElJsonDoc } from 'tms-vue-ui'
import { Dialog, Form, FormItem, Input, Button } from 'element-ui'
Vue.use(Dialog)
  .use(Form)
  .use(FormItem)
  .use(Input)
  .use(Button)

import apiCollection from '../apis/collection'
import apiSchema from '../apis/schema'

export default {
  name: 'CollectionEditor',
  components: { TmsElJsonDoc },
  props: {
    advancedToggle: { default: false },
    dialogVisible: { default: true },
    dbName: { type: String },
    collection: {
      type: Object,
      default: function() {
        return { name: '', title: '', description: '', schema_id: '', schema: {} }
      }
    }
  },
  data() {
    return {
      mode: '',
      destroyOnClose: true,
      closeOnClickModal: false,
      schemas: []
    }
  },
  watch: {
    'collection.schema_id'(oldVal, newVal) {
      if (!oldVal) return false
      this.collection.schema = this.schemas.filter(item => {
        if (item._id===newVal) {
          return item.schema
        }
      })
    }
  },
  mounted() {
    apiSchema.listSimple().then(schemas => {
      this.schemas = schemas
    })
  },
  methods: {
    onSubmit() {
      if (this.mode === 'create')
        apiCollection
          .create(this.dbName, this.collection)
          .then(newCollection => this.$emit('submit', newCollection))
      else if (this.mode === 'update')
        apiCollection
          .update(this.dbName, this.collection.name, this.collection)
          .then(newCollection => this.$emit('submit', newCollection))
    },
    open(mode, dbName, collection) {
      this.mode = mode
      this.dbName = dbName
      if (mode === 'update') Object.assign(this.collection, collection)
      this.$mount()
      document.body.appendChild(this.$el)
      return new Promise(resolve => {
        this.$on('submit', newCollection => {
          this.dialogVisible = false
          resolve(newCollection)
        })
      })
    }
  }
}
</script>