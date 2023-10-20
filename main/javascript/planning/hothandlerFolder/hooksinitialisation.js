import HandsontableHooksHandler from '../hothooksfolder/HandsontableHooksHandler.js';

export default class hooksinitialisation {
    constructor(hotInstance, headers) {
      this.hotInstance = hotInstance;
      this.headers = headers;
      this.HandsontableHooksHandler = new HandsontableHooksHandler(this.hotInstance, this.headers);
      this.initializeHooks();
    }
  
    initializeHooks() {
      this.hotInstance.addHook('afterChange', this.HandsontableHooksHandler.afterChangeHandler.bind(this.HandsontableHooksHandler));
      this.hotInstance.addHook('afterCreateRow', this.HandsontableHooksHandler.afterCreateRowHandler.bind(this.HandsontableHooksHandler));
      this.hotInstance.addHook('beforeRemoveRow', this.HandsontableHooksHandler.beforeRemoveRowHandler.bind(this.HandsontableHooksHandler));
      this.hotInstance.addHook('beforeKeyDown', this.HandsontableHooksHandler.beforeKeyDownHandler.bind(this.HandsontableHooksHandler));
    }
    async afterLoadDataHandler() {
        return await this.HandsontableHooksHandler.afterLoadDataHandler();
    }
  }