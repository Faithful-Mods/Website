Vue.component('local-download', {
  props: {
    canPack: Boolean,
  },
  template: 
    '<button id="DownloadLocally" :disabled="!canPack && isDownloading" class="btn btn-block btn-custom" v-on:click="downloadLocally">Download locally (ALPHA)</button>',
  data() {
    return {
      dbName: 'faithful',
      dbVersion: 2.0,
      database: null,
      store: null,
      stores: [
        {
          name: 'files',
          options: { autoIncrement: true }
        }
      ],
      isDownloading: false
    }
  },
  methods: {
    downloadMod: function(mod) {
      return axios({
        url:
          "https://api.allorigins.win/raw?url=https://github.com/" + "Faithful-Mods" + "/" + mod.name + "/archive/" + mod.version + ".zip",
        method: "GET",
        responseType: "blob" // important
      })
    },
    downloadLocally: function() {
      const finalZip = new JSZip()

      this.isDownloading = true

      const modSelection = this.$root.modSelection

      const promises = []
      modSelection.forEach(mod => {
        promises.push(this.downloadMod(mod))
      })

      console.log(promises)

      let success = 0
      Promise.all(promises).then((values) => {
        values.forEach((res, index) => {
          const fileKey = modSelection[index].name + '-' + modSelection[index].version

          this.store.delete(fileKey).then(() => {
            return this.store.put(res.data, fileKey)
          })
          .then(() => {
            let zip = new JSZip()
            return zip.loadAsync(res.data)
          })
          .then((zip) => {
            const keys = Object.keys(zip.files)
          
            let newName
            for(let i = 0; i < keys.length; ++i) {
              newName = keys[i].replace(fileKey + '/', '')
              
              if(newName.trim() !== '') {
                finalZip.files[newName] = zip.files[keys[i]]
                finalZip.files[newName].name = newName
              }
            }

            ++success
            // if all archives have been successfully added
            if(success == modSelection.length) {
              finalZip.generateAsync({
                type:"blob",
                comment: "Resource pack generated by Faithful Mods",
                compression: "DEFLATE",
                compressionOptions: {
                  level: 9
                }
              }).then(blob => {            // 1) generate the zip file
                  saveAs(blob, 'Faithful Mods Resource Pack ' + ((new Date).getTime()) + ".zip") // 2) trigger the download
                  this.isDownloading = false
              }, err => {
                  console.error(err)
                  this.isDownloading = false
              });
            }
          }).catch(err => {
            console.error(err)
            this.isDownloading = false
          })
        })
      }).catch(reason => {
        console.error(reason)
        this.isDownloading = false
      })
    }
  },
  computed: {
  },
  mounted: function() {  
    IndexedDBPromise.open(this.dbName, this.dbVersion, this.stores)
    .then((db) => {
      this.database = db
      return db.getStore(this.stores[0].name, 'readwrite', true)
    })
    .then((store) => {
      this.store = store
    })
  }
})