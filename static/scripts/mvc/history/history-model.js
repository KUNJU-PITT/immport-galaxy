define(["mvc/history/history-contents","utils/utils","mvc/base-mvc","utils/localization"],function(a,b,c){"use strict";var d="history",e=Backbone.Model.extend(c.LoggableMixin).extend(c.mixin(c.SearchableModelMixin,{_logNamespace:d,defaults:{model_class:"History",id:null,name:"Unnamed History",state:"new",deleted:!1},urlRoot:Galaxy.root+"api/histories",initialize:function(b,c,d){d=d||{},this.logger=d.logger||null,this.log(this+".initialize:",b,c,d),this.log("creating history contents:",c),this.contents=new a.HistoryContents(c||[],{historyId:this.get("id")}),this._setUpListeners(),this.updateTimeoutId=null},_setUpListeners:function(){this.on("error",function(a,b,c,d,e){this.errorHandler(a,b,c,d,e)}),this.contents&&this.listenTo(this.contents,"error",function(){this.trigger.apply(this,["error:contents"].concat(jQuery.makeArray(arguments)))}),this.on("change:id",function(a,b){this.contents&&(this.contents.historyId=b)})},errorHandler:function(){this.clearUpdateTimeout()},nice_size:function(){return b.bytesToString(this.get("size"),!0,2)},toJSON:function(){return _.extend(Backbone.Model.prototype.toJSON.call(this),{nice_size:this.nice_size()})},get:function(a){return"nice_size"===a?this.nice_size():Backbone.Model.prototype.get.apply(this,arguments)},ownedByCurrUser:function(){return Galaxy&&Galaxy.user?Galaxy.user.isAnonymous()||Galaxy.user.id!==this.get("user_id")?!1:!0:!1},contentsCount:function(){return _.reduce(_.values(this.get("state_details")),function(a,b){return a+b},0)},searchAttributes:["name","annotation","tags"],searchAliases:{title:"name",tag:"tags"},checkForUpdates:function(a){return this.contents.running().length?this.setUpdateTimeout():(this.trigger("ready"),_.isFunction(a)&&a.call(this)),this},setUpdateTimeout:function(a){a=a||e.UPDATE_DELAY;var b=this;return this.clearUpdateTimeout(),this.updateTimeoutId=setTimeout(function(){b.refresh()},a),this.updateTimeoutId},clearUpdateTimeout:function(){this.updateTimeoutId&&(clearTimeout(this.updateTimeoutId),this.updateTimeoutId=null)},refresh:function(a,b){a=a||[],b=b||{};var c=this;b.data=b.data||{},a.length&&(b.data.details=a.join(","));var d=this.contents.fetch(b);return d.done(function(){c.checkForUpdates(function(){this.fetch()})}),d},_delete:function(a){return this.get("deleted")?jQuery.when():this.save({deleted:!0},a)},purge:function(a){return this.get("purged")?jQuery.when():this.save({deleted:!0,purged:!0},a)},undelete:function(a){return this.get("deleted")?this.save({deleted:!1},a):jQuery.when()},copy:function(a,b,c){if(a=void 0!==a?a:!0,!this.id)throw new Error("You must set the history ID before copying it.");var d={history_id:this.id};a&&(d.current=!0),b&&(d.name=b),c||(d.all_datasets=!1);var f=this,g=jQuery.post(this.urlRoot,d);return a?g.then(function(a){var b=new e(a);return b.setAsCurrent().done(function(){f.trigger("copied",f,a)})}):g.done(function(a){f.trigger("copied",f,a)})},setAsCurrent:function(){var a=this,b=jQuery.getJSON(Galaxy.root+"history/set_as_current?id="+this.id);return b.done(function(){a.trigger("set-as-current",a)}),b},toString:function(){return"History("+this.get("id")+","+this.get("name")+")"}}));e.UPDATE_DELAY=4e3,e.getHistoryData=function(a,b){function c(){return"current"===a?jQuery.getJSON(Galaxy.root+"history/current_history_json"):jQuery.ajax(Galaxy.root+"api/histories/"+a)}function d(a){return a&&a.empty}function e(a){if(d(a))return[];_.isFunction(f)&&(f=f(a)),_.isFunction(g)&&(g=g(a));var b={};return f.length&&(b.dataset_details=f.join(",")),g.length&&(b.dataset_collection_details=g.join(",")),jQuery.ajax(Galaxy.root+"api/histories/"+a.id+"/contents",{data:b})}b=b||{};var f=b.detailIdsFn||[],g=b.hdcaDetailIds||[],h=jQuery.Deferred(),i=null,j=b.historyFn||c,k=b.contentsFn||e,l=j(a);l.done(function(a){i=a,h.notify({status:"history data retrieved",historyJSON:i})}),l.fail(function(a){h.reject(a,"loading the history")});var m=l.then(k);return m.then(function(a){h.notify({status:"contents data retrieved",historyJSON:i,contentsJSON:a}),h.resolve(i,a)}),m.fail(function(a){h.reject(a,"loading the contents",{history:i})}),h};var f={fetch:function(a){return a=a||{},a.data=a.data||this._buildFetchData(a),a.traditional=!0,Backbone.Collection.prototype.fetch.call(this,a)},_fetchOptions:["order","limit","offset","view","keys"],_buildFetchData:function(a){var b={},c=this._fetchDefaults();a=_.defaults(a||{},c),b=_.pick(a,this._fetchOptions);var d=_.has(a,"filters")?a.filters:c.filters||{};return _.isEmpty(d)||_.extend(b,this._buildFetchFilters(d)),b},_fetchDefaults:function(){return{}},_buildFetchFilters:function(a){var b={q:[],qv:[]};return _.each(a,function(a,c){a===!0&&(a="True"),a===!1&&(a="False"),b.q.push(c),b.qv.push(a)}),b}},g=Backbone.Collection.extend(c.LoggableMixin).extend(f).extend({_logNamespace:d,model:e,DEFAULT_ORDER:"update_time",sortOrders:{update_time:{getter:function(a){return new Date(a.get("update_time"))},asc:!1},"update_time-asc":{getter:function(a){return new Date(a.get("update_time"))},asc:!0},name:{getter:function(a){return a.get("name")},asc:!0},"name-dsc":{getter:function(a){return a.get("name")},asc:!1},size:{getter:function(a){return a.get("size")},asc:!1},"size-asc":{getter:function(a){return a.get("size")},asc:!0}},initialize:function(a,b){b=b||{},this.log("HistoryCollection.initialize",arguments),this.includeDeleted=b.includeDeleted||!1,this.setOrder(b.order||this.DEFAULT_ORDER),this.currentHistoryId=b.currentHistoryId,this.allFetched=b.allFetched||!1,this.setUpListeners()},urlRoot:Galaxy.root+"api/histories",url:function(){return this.urlRoot},_fetchDefaults:function(){var a={order:this.order,view:"detailed"};return this.includeDeleted||(a.filters={deleted:!1,purged:!1}),a},setUpListeners:function(){this.on({"change:deleted":function(a){this.debug("change:deleted",this.includeDeleted,a.get("deleted")),!this.includeDeleted&&a.get("deleted")&&this.remove(a)},copied:function(a,b){this.setCurrent(new e(b,[]))},"set-as-current":function(a){var b=this.currentHistoryId;this.trigger("no-longer-current",b),this.currentHistoryId=a.id}})},sort:function(a){return a=a||{},this.setOrder(a.order),Backbone.Collection.prototype.sort.call(this,a)},setOrder:function(a){var b=this,c=this.sortOrders[a];if(!_.isUndefined(c))return b.order=a,b.comparator=function(a,d){var e=b.currentHistoryId;return a.id===e?-1:d.id===e?1:(a=c.getter(a),d=c.getter(d),c.asc?a===d?0:a>d?1:-1:a===d?0:a>d?-1:1)},b.trigger("changed-order",b.order,b),b},fetch:function(a){if(a=a||{},this.allFetched)return jQuery.when({});var b=this,c=_.defaults(a,{remove:!1,offset:b.length>=1?b.length-1:0,order:b.order}),d=a.limit;return _.isUndefined(d)||(c.limit=d),f.fetch.call(this,c).done(function(a){var c=_.isArray(a)?a.length:0;(!d||d>c)&&(b.allFetched=!0,b.trigger("all-fetched",b))})},create:function(a,b,c){var d=this,f=jQuery.getJSON(Galaxy.root+"history/create_new_current");return f.done(function(a){d.setCurrent(new e(a,[],c||{}))})},setCurrent:function(a,b){return b=b||{},this.unshift(a,b),this.currentHistoryId=a.get("id"),b.silent||this.trigger("new-current",a,this),this},reset:function(a,b){return this.allFetched=!1,Backbone.Collection.prototype.reset.call(this,a,b)},toString:function(){return"HistoryCollection("+this.length+")"}});return{History:e,HistoryCollection:g}});
//# sourceMappingURL=../../../maps/mvc/history/history-model.js.map