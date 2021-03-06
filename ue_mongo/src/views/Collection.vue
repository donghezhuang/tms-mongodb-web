<template>
  <tms-frame class="tmw-document" :display="{ header: true, footer: false, right: true }" :leftWidth="'20%'">
    <template v-slot:header>
      <el-breadcrumb separator-class="el-icon-arrow-right">
        <el-breadcrumb-item :to="{ name: 'home' }">首页</el-breadcrumb-item>
        <el-breadcrumb-item :to="{ name: 'database', params: { dbName: dbName } }">{{dbName}}</el-breadcrumb-item>
        <el-breadcrumb-item>{{clName}}</el-breadcrumb-item>
      </el-breadcrumb>
    </template>
    <template v-slot:center>
      <el-table id="tables" :data="documents" stripe ref="multipleTable" :height="tableHeight" @selection-change="handleSelectDocument">
        <el-table-column fixed="left" type="selection" width="55"></el-table-column>
        <el-table-column v-for="(s, k) in properties" :key="k" :prop="k">
          <template slot="header">
            <i v-if="s.description" class="el-icon-info" :title="s.description"></i>
            <i v-if="s.required" style="color:red">*</i>
            <span> {{s.title}} </span>
            <img src="../assets/icon_filter.png" class="icon_filter" @click="handleSelect(s, k)">
          </template>
          <template slot-scope="scope">
            <span v-if="s.type==='boolean'">{{ scope.row[k] ? '是' : '否' }}</span>
            <span v-else-if="s.type==='array'&&s.format==='file'">
              <span v-for="(i, v) in scope.row[k]" :key="v">
                <a href @click="handleDownload(i)">{{i.name}}</a><br />
              </span>
            </span>
            <span v-else-if="s.type === 'array' && s.enum">
              <span v-for="(i, v) in s.enum" :key="v">
                <span v-if="scope.row[k] && scope.row[k].includes(i.value)">{{i.label}}&nbsp;</span>
              </span>
            </span>
            <span v-else-if="s.type === 'string' && s.enum">
              <span v-for="(i, v) in s.enum" :key="v">
                <span v-if="scope.row[k] === i.value">{{i.label}}</span>
              </span>
            </span>
            <span v-else>{{ scope.row[k] }}</span>
          </template>
        </el-table-column>
        <el-table-column fixed="right" label="操作" width="150">
          <template slot-scope="scope">
            <el-button size="mini" @click="editDocument(scope.row)">修改</el-button>
            <el-button size="mini" @click="removeDocument(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <tms-flex class="tmw-pagination">
        <span class="tmw-pagination__text">已选中 {{totalByChecked}} 条数据</span>
        <el-pagination background @size-change="handleSize" @current-change="handleCurrentPage" :current-page.sync="page.at" :page-sizes="[10, 25, 50, 100]" :page-size="page.size" layout="total, sizes, prev, pager, next" :total="page.total">
        </el-pagination>
      </tms-flex>
    </template>
    <template v-slot:right>
      <tms-flex direction="column">
        <div>
          <el-button @click="createDocument">添加数据</el-button>
        </div>
        <el-dropdown @command="batchEditDocument" placement="bottom-start">
          <el-button>批量修改<i class="el-icon-arrow-down el-icon--right"></i></el-button>
          <el-dropdown-menu slot="dropdown">
            <el-dropdown-item command="all" :disabled="totalByAll==0">按全部({{totalByAll}})</el-dropdown-item>
            <el-dropdown-item command="filter" :disabled="totalByFilter==0">按筛选({{totalByFilter}})</el-dropdown-item>
            <el-dropdown-item command="checked" :disabled="totalByChecked==0">按选中({{totalByChecked}})</el-dropdown-item>
          </el-dropdown-menu>
        </el-dropdown>
        <el-upload action="#" :show-file-list="false" :http-request="importDocument">
          <el-button>导入数据</el-button>
        </el-upload>
        <el-dropdown @command="exportDocument" placement="bottom-start">
          <el-button>导出数据<i class="el-icon-arrow-down el-icon--right"></i></el-button>
          <el-dropdown-menu slot="dropdown">
            <el-dropdown-item command="all" :disabled="totalByAll==0">按全部({{totalByAll}})</el-dropdown-item>
            <el-dropdown-item command="filter" :disabled="totalByFilter==0">按筛选({{totalByFilter}})</el-dropdown-item>
            <el-dropdown-item command="checked" :disabled="totalByChecked==0">按选中({{totalByChecked}})</el-dropdown-item>
          </el-dropdown-menu>
        </el-dropdown>
        <el-dropdown @command="batchRemoveDocument" placement="bottom-start">
          <el-button>批量删除<i class="el-icon-arrow-down el-icon--right"></i></el-button>
          <el-dropdown-menu slot="dropdown">
            <el-dropdown-item command="all" :disabled="totalByAll==0">按全部({{totalByAll}})</el-dropdown-item>
            <el-dropdown-item command="filter" :disabled="totalByFilter==0">按筛选({{totalByFilter}})</el-dropdown-item>
            <el-dropdown-item command="checked" :disabled="totalByChecked==0">按选中({{totalByChecked}})</el-dropdown-item>
          </el-dropdown-menu>
        </el-dropdown>
        <hr />
        <el-checkbox-group v-model="moveCheckList" v-if="plugins.document.transforms&&plugins.document.transforms.move">
          <el-checkbox v-for="(t, k) in plugins.document.transforms.move" :label="t.name" :key="k">{{t.label}}</el-checkbox>
        </el-checkbox-group>
        <el-dropdown @command="batchMoveDocument" placement="bottom-start">
          <el-button>数据迁移<i class="el-icon-arrow-down el-icon--right"></i></el-button>
          <el-dropdown-menu slot="dropdown">
            <el-dropdown-item command="all" :disabled="totalByAll==0">按全部({{totalByAll}})</el-dropdown-item>
            <el-dropdown-item command="filter" :disabled="totalByFilter==0">按筛选({{totalByFilter}})</el-dropdown-item>
            <el-dropdown-item command="checked" :disabled="totalByChecked==0">按选中({{totalByChecked}})</el-dropdown-item>
          </el-dropdown-menu>
        </el-dropdown>
        <hr />
        <div v-for="s in plugins.document.submits" :key="s.id">
          <el-button @click="handlePlugin(s, null)" v-if="!s.batch">{{s.name}}</el-button>
          <el-dropdown v-if="s.batch">
            <el-button type="success" plain>{{s.name}}<i class="el-icon-arrow-down el-icon--right"></i></el-button>
            <el-dropdown-menu slot="dropdown">
              <el-dropdown-item>
                <el-button type="text" @click="handlePlugin(s, 'all')" :disabled="totalByAll==0">按全部({{totalByAll}})</el-button>
              </el-dropdown-item>
              <el-dropdown-item>
                <el-button type="text" @click="handlePlugin(s, 'filter')" :disabled="totalByFilter==0">按筛选({{totalByFilter}})</el-button>
              </el-dropdown-item>
              <el-dropdown-item>
                <el-button type="text" @click="handlePlugin(s, 'checked')" :disabled="totalByChecked==0">按选中({{totalByChecked}})</el-button>
              </el-dropdown-item>
            </el-dropdown-menu>
          </el-dropdown>
        </div>
        <div v-for="(s, i) in pluginData" :key="i">
          <el-button @click="handlePlugins(s, null)" v-if="!s[2].batch">{{s[2].name}}</el-button>
          <el-dropdown v-if="s[2].batch">
            <el-button>{{s[2].name}}<i class="el-icon-arrow-down el-icon--right"></i></el-button>
            <el-dropdown-menu slot="dropdown">
              <el-dropdown-item>
                <el-button type="text" @click="handlePlugins(s, 'all')" :disabled="totalByAll==0">按全部({{totalByAll}})</el-button>
              </el-dropdown-item>
              <el-dropdown-item>
                <el-button type="text" @click="handlePlugins(s, 'filter')" :disabled="totalByFilter==0">按筛选({{totalByFilter}})</el-button>
              </el-dropdown-item>
              <el-dropdown-item>
                <el-button type="text" @click="handlePlugins(s, 'checked')" :disabled="totalByChecked==0">按选中({{totalByChecked}})</el-button>
              </el-dropdown-item>
            </el-dropdown-menu>
          </el-dropdown>
        </div>
      </tms-flex>
    </template>
  </tms-frame>
</template>

<script>
import Vue from 'vue'
import { mapState, mapMutations } from 'vuex'
import { Frame, Flex } from 'tms-vue-ui'
Vue.use(Frame).use(Flex)
import {
  Table,
  TableColumn,
  Input,
  Row,
  Col,
  Button,
  Upload,
  Pagination,
  Tag,
  Message,
  MessageBox,
  Radio,
  Checkbox,
  CheckboxGroup,
  Dropdown,
  DropdownMenu,
  DropdownItem,
  Breadcrumb,
  BreadcrumbItem
} from 'element-ui'
Vue.use(Table)
  .use(TableColumn)
  .use(Input)
  .use(Row)
  .use(Col)
  .use(Button)
  .use(Upload)
  .use(Pagination)
  .use(Tag)
  .use(Radio)
  .use(Checkbox)
  .use(CheckboxGroup)
  .use(Dropdown)
  .use(DropdownMenu)
  .use(DropdownItem)
  .use(Breadcrumb)
  .use(BreadcrumbItem)

import DocEditor from '../components/DocEditor.vue'
import ColumnValueEditor from '../components/ColumnValueEditor.vue'
import DomainEditor from '../components/DomainEditor.vue'
import SelectCondition from '../components/SelectCondition.vue'
import MoveByRulePlugin from '../plugins/move/Main.vue'
import { collection as apiCol, doc as apiDoc, plugin as apiPlugin, schema as apiSchema } from '../apis'
import apiPlugins from '../plugins'

export default {
  name: 'Collection',
  props: ['bucketName', 'dbName', 'clName'],
  data() {
    return {
      tableHeight: 0,
      moveCheckList: [],
      filter: {},
      page: {
        at: 1,
        size: 100,
        total: 0
      },
      multipleDocuments: [],
      properties: {},
      plugins: { document: { submits: [], transforms: {} } },
      dialogPage: {
        at: 1,
        size: 100
      },
      pluginData: []
    }
  },
  computed: {
    ...mapState(['documents', 'conditions']),
    totalByAll() {
      return Object.keys(this.filter).length ? 0 : this.page.total
    },
    totalByFilter() {
      return Object.keys(this.filter).length ? this.page.total : 0
    },
    totalByChecked() {
      return this.multipleDocuments.length
    }
  },
  methods: {
    ...mapMutations([
      'conditionReset',
      'conditionDelBtn',
      'conditionDelColumn'
    ]),
    handleCondition() {
      let _obj = JSON.parse(JSON.stringify(this.conditions))
      if (!_obj.length) {
        return { filter: {}, orderBy: {} }
      }
      if (_obj.length === 1) {
        return {
          filter: _obj[0].rule.filter,
          orderBy: _obj[0].rule.orderBy
        }
      }
      return _obj
        .map(ele => ele.rule)
        .reduce((prev, curr) => {
          return {
            filter: Object.assign(prev.filter, curr.filter),
            orderBy: Object.assign(prev.orderBy, curr.orderBy)
          }
        })
    },
    listByColumn(
      columnName, 
      filter, 
      orderBy, 
      at, 
      size, 
      bucketName = this.bucketName, 
      dbName = this.dbName, 
      clName = this.clName
    ) {
      return apiDoc
          .byColumnVal(
            bucketName, 
            dbName, 
            clName, 
            columnName, 
            filter, 
            orderBy, 
            at, 
            size
          )
    },
    handleSelect(obj, columnName) {
      this.dialogPage.at = 1
      const select = new Vue(SelectCondition)
      let filter, orderBy
      if (this.conditions.length) {
        const columnobj = this.conditions.find(
          ele => ele.columnName === columnName
        )
        const rule = this.handleCondition()
        if (columnobj) {
          select.condition.isCheckBtn = columnobj.isCheckBtn
          select.condition.keyword = columnobj.keyword
          select.condition.selectValue = columnobj.selectValue
          select.condition.rule = columnobj.rule
        }
        filter = rule.filter
        orderBy = rule.orderBy
      }
      this
        .listByColumn(
          columnName,
          this.conditions.length ? filter: undefined,
          this.conditions.length ? orderBy: undefined,
          this.dialogPage.at,
          this.dialogPage.size
        )
        .then(columnResult => {
          select.condition.selectResult = columnResult
          select.condition.multipleSelection = columnResult
          // 暂时先用延迟解决，该方法还需改进
          setTimeout(() => {
            select.toggleSelection(columnResult)
          }, 0)
        })
      select
        .open(
          columnName, 
          this.dialogPage, 
          this.handleCondition(),
          this.listByColumn,
          this.properties[columnName]
        )
        .then(rsl => {
          const { condition, isClear, isCheckBtn } = rsl
          this.$store.commit('conditionAddColumn', { condition })
          if (isClear) this.$store.commit('conditionDelColumn', { condition })
          let objPro = this.properties
          if (isCheckBtn) this.$store.commit('conditionDelBtn', { columnName })
          Object.keys(objPro).map((ele, index) => {
            const attrs = document.querySelectorAll(
              '#tables thead img'
            )[index]
            if (ele === columnName) {
              if (isClear) {
                attrs.src = require('../assets/icon_filter.png')
              } else if (isCheckBtn) {
                attrs.src = require('../assets/icon_' +
                  condition.rule.orderBy[columnName] +
                  '_active.png')
              } else {
                attrs.src = require('../assets/icon_filter_active.png')
              }
            } else if (isCheckBtn) {
              // 如果选择升降序规则，则需重置其他图标
              this.conditions.map(conEle => {
                if (ele === conEle.columnName) {
                  if (
                    conEle.rule &&
                    conEle.rule.filter &&
                    conEle.rule.filter[ele] &&
                    conEle.rule.filter[ele].keyword
                  ) {
                    attrs.src = require('../assets/icon_filter_active.png')
                  } else if (conEle.isCheckBtn.includes(false)) {
                    attrs.src = require('../assets/icon_' +
                      conEle.rule.orderBy[ele] +
                      '_active.png')
                  } else {
                    attrs.src = require('../assets/icon_filter.png')
                  }
                }
              })
            }
            return ele
          })
          this.listDocument()
        })
    },
    handleSelectDocument(rows) {
      this.multipleDocuments = rows
    },
    fnGetMultipleIds() {
      let ids = this.multipleDocuments.map(document => document._id)
      return ids
    },
    listPlugin() {
      apiPlugins.plugin.list().then(plugins => {
        if (JSON.stringify(plugins) !== '{}') {
					if (plugins.document.transforms) {
						this.moveCheckList = plugins.document.transforms.move.map(option => option.name)
						plugins.document.submits.forEach(submit => {
							let transforms = plugins.document.transforms[submit.id]
							submit.checkList = transforms ? transforms.map(item => item.name) : []
						})
					}
          this.plugins = plugins
        }
      })
    },
    listDocument() {
      const rule = this.handleCondition()
      this.filter = rule.filter
      const { orderBy, filter } = rule
      this.$store
        .dispatch({
          type: 'listDocument',
          bucket: this.bucketName,
          db: this.dbName,
          cl: this.clName,
          page: this.page,
          filter,
          orderBy
        })
        .then(result => {
          this.page.total = result.result.total
          this.tableHeight = window.innerHeight * 0.8
        })
		},
		handleDownload(file) {
			const access_token = sessionStorage.getItem('access_token')
      window.open(`${process.env.VUE_APP_BACK_API_FS}${file.url}?access_token=${access_token}`)
		},
    createDocument() {
      let editor = new Vue(DocEditor)
      editor.open(this.bucketName, this.dbName, this.collection).then(() => {
        this.listDocument()
      })
    },
    editDocument(doc) {
      let editor = new Vue(DocEditor)
      editor
        .open(this.bucketName, this.dbName, this.collection, doc)
        .then(newDoc => {
          Object.assign(doc, newDoc)
          this.$store.commit({
            type: 'updateDocument',
            document: newDoc
          })
        })
    },
    fnSetReqParam(command, checkList) {
      let param, transforms
      param = {}
      transforms = checkList && checkList.join(',')
      switch (command) {
        case 'all':
          param.filter = 'ALL'
          break
        case 'filter':
          param.filter = this.handleCondition().filter
          this.filter = param.filter
          break
        case 'checked':
          param.docIds = this.fnGetMultipleIds()
      }
      return { param: param, transforms: transforms }
    },
    fnHandleResResult(result, isMultiple) {
      const realAt = Math.ceil((this.page.total - result.n) / this.page.size)
      this.page.at = realAt > this.page.at ? this.page.at : realAt ? realAt : 1
      this.listDocument()
      if (isMultiple) {
        this.$refs.multipleTable.clearSelection()
        this.multipleDocuments = []
      }
    },
    batchEditDocument(command) {
      let { param } = this.fnSetReqParam(command),
        editor
      editor = new Vue(ColumnValueEditor)
      editor.open(this.collection).then(columns => {
        Object.assign(param, { columns })
        apiDoc
          .batchUpdate(
            this.bucketName,
            this.dbName,
            this.collection.name,
            param
          )
          .then(result => {
            Message.success({ message: '已成功修改' + result.n + '条' })
            this.listDocument()
          })
      })
    },
    removeDocument(document) {
      MessageBox({
        title: '提示',
        message: '确定删除该条数据？',
        confirmButtonText: '确定',
        type: 'warning'
      })
        .then(() => {
          apiDoc
            .remove(this.bucketName, this.dbName, this.clName, document._id)
            .then(() => {
              Message.success({ message: '删除成功' })
              this.fnHandleResResult({ n: 1 }, false)
            })
        })
        .catch(() => {})
    },
    batchRemoveDocument(command) {
      let { param } = this.fnSetReqParam(command)
      MessageBox({
        title: '提示',
        message: '确定删除这些数据？',
        confirmButtonText: '确定',
        type: 'warning'
      })
        .then(() => {
          apiDoc
            .batchRemove(this.bucketName, this.dbName, this.clName, param)
            .then(result => {
              Message.success({ message: '已成功删除' + result.n + '条' })
              this.fnHandleResResult(result, true)
            })
        })
        .catch(() => {})
    },
    fnMoveDocument(
      dbName,
      clName,
      transforms,
      param,
      pTotal,
      aMTotal,
      aMPTotal
    ) {
      let msg = Message.info({ message: '开始迁移数据...', duration: 0 }),
        _this = this
      async function fnmove(
        dbName,
        clName,
        transforms,
        param,
        pTotal,
        aMTotal,
        aMPTotal
      ) {
        let result = await apiDoc
          .move(
            _this.bucketName,
            _this.dbName,
            _this.clName,
            dbName,
            clName,
            transforms,
            param,
            pTotal,
            aMTotal,
            aMPTotal
          )
          .catch(() => msg.close())
        if (result) {
          let {
            planTotal,
            alreadyMoveTotal,
            alreadyMovePassTotal,
            alreadyMoveFailTotal,
            spareTotal
          } = result
          msg.message = '正在迁移数据...'
          if (spareTotal <= 0) {
            msg.message =
              '成功迁移' +
              alreadyMovePassTotal +
              '条，失败' +
              alreadyMoveFailTotal +
              '条'
            setTimeout(() => msg.close(), 1000)
            return result
          }
          return fnmove(
            dbName,
            clName,
            transforms,
            param,
            planTotal,
            alreadyMoveTotal,
            alreadyMovePassTotal
          )
        }
      }
      return fnmove(
        dbName,
        clName,
        transforms,
        param,
        pTotal,
        aMTotal,
        aMPTotal
      )
    },
    batchMoveDocument(command) {
      let { param, transforms } = this.fnSetReqParam(
          command,
          this.moveCheckList
        ),
        confirm,
        config
      confirm = new Vue(DomainEditor)
      config = { title: '迁移到' }
      confirm.open(this.bucketName, config).then(fields => {
        const { dbName, clName } = fields
        if (command === 'checked') {
          this.fnMoveDocument(dbName, clName, transforms, param, 0, 0, 0).then(
            result => {
              this.fnHandleResResult({ n: result.alreadyMovePassTotal }, true)
            }
          )
        } else {
          this.fnMoveDocument(dbName, clName, transforms, param, 0, 0, 0).then(
            () => {
              this.page.at = 1
              this.listDocument()
            }
          )
        }
      })
    },
    importDocument(data) {
      let formData = new FormData()
      const msg = Message.info({ message: '正在导入数据...', duration: 0 })
      formData.append('file', data.file)
      apiDoc
        .import(this.bucketName, this.dbName, this.clName, formData)
        .then(() => {
          this.listDocument()
          setTimeout(() => msg.close(), 1000)
        }).catch(() => {
          setTimeout(() => msg.close(), 1000)
        })
    },
    exportDocument(command) {
			let { param } = this.fnSetReqParam(command)
      apiDoc.export(this.bucketName, this.dbName, this.clName, param).then(result => {
        const access_token = sessionStorage.getItem('access_token')
        window.open(
          `${process.env.VUE_APP_BACK_API_FS}${result}?access_token=${access_token}`
        )
      })
    },
    pluginOfMoveByRule(transforms) {
      let confirm, config
      confirm = new Vue(DomainEditor)
      config = { title: '选定规则表' }
      confirm.open(this.bucketName, config).then(fields => {
        const { dbName: ruleDbName, clName: ruleClName } = fields
        let moveByRule = new Vue(MoveByRulePlugin)
        moveByRule.showDialog(
          this.dbName,
          this.clName,
          ruleDbName,
          ruleClName,
          transforms
        )
      })
    },
    handlePlugin(submit, type) {
      let transforms = submit.checkList ? submit.checkList.join(',') : ""
      let { param } = type ? this.fnSetReqParam(type) : { param: null }
      switch (submit.id) {
        case 'moveByRule':
          this.pluginOfMoveByRule(transforms, param)
          break
        case 'calibrateInfo':
          this.pluginOfCheckData(transforms, param, 0, 0, 0)
      }
    },
    async handlePlugins(s, type) {
      const { param: postParams } = type ? this.fnSetReqParam(type) : { param: null }
      const isType = Object.prototype.toString
      const obj = '[object Object]'
      let getParams = {
        bucket: this.bucketName || 'pool',
        pluginCfg: s[0],
        db: this.dbName,
        clName: this.clName
      }
      if (s[2].isConfirm) {
        await MessageBox.confirm(s[2].confirmMsg, '提示', {
          confirmButtonText: s[2].confirmText || '确定',
          cancelButtonText: s[2].cancelText || '取消',
        })
          .then(() => {
            Object.assign(getParams, s[2].successParams && isType.call(s[2].successParams) === obj ? s[2].successParams : {})
          })
          .catch(() => {
            Object.assign(getParams, s[2].failParams && isType.call(s[2].failParams) === obj ? s[2].failParams : {})
          })
      }
      let params = [postParams, getParams]
      apiPlugin
        .handlePlugin(...params).then(() => {
          this.listDocument()
        })
    },
    handleSize(val) {
      this.page.size = val
      this.dialogPage.size = val
      this.listDocument()
    },
    handleCurrentPage(val) {
      this.page.at = val
      this.listDocument()
    },
    async handleProperty() {
      let tags = (process.env.VUE_APP_TAGS && process.env.VUE_APP_TAGS.split(',')) || this.collection.tags
      let default_tag = (process.env.VUE_APP_DEFAULT_TAG && process.env.VUE_APP_DEFAULT_TAG.split(',')) || this.collection.default_tag

      if (default_tag && default_tag.length) {
        for(let i=0; i<default_tag.length; i++) {
          let schemas = await apiSchema.listByTag(this.bucketName, default_tag[i])
          schemas.forEach(schema => {
            Object.assign(this.properties, schema.body.properties)
          })
        }
      } else if (tags && tags.length) {
        for(let i=0; i<tags.length; i++) {
          let schemas = await apiSchema.listByTag(this.bucketName, tags[i])
          schemas.forEach(schema => {
            Object.assign(this.properties, schema.body.properties)
          })
        }
      } else {
        Object.assign(this.properties, this.collection.schema.body.properties)
      }
    }
  },
  mounted() {
    apiCol
      .byName(this.bucketName, this.dbName, this.clName)
      .then(async collection => {
        this.collection = collection
        await this.handleProperty()
        this.listDocument()
        this.listPlugin()
      })
    apiPlugin
      .getPlugins().then(res => {
        this.pluginData = res
      })
  },
  beforeDestroy() {
    this.conditionReset()
  }
}
</script>
<style lang="less" scoped>
.tmw-document {
  .icon-style {
    margin-left: 10px;
    cursor: pointer;
  }
  .icon-heightlight {
    color: #409eff;
  }
  .icon_filter {
    width: 15px;
    height: 15px;
    vertical-align: middle;
    cursor: pointer;
  }
}
</style>