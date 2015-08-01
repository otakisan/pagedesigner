"use strict";

var pageDesignerGlobal = {};
(function (pageDesigner) {

	// var worker = new Worker("pageDesignerWorker.js");
	// worker.addEventListener("message", function(messageEvent){
	// 	// Workerスレッドからの返り
	// 	// スレッドID（元のスレッドに戻ってきたか）については、ブラウザの開発者ツールで確認する
		
	// 	// localStorageから消す
	// 	var resultObject = messageEvent.data[0];
	// 	if(resultObject.result === "success"){
	// 		localStorage.removeItem(resultObject.key);
			
	// 	}else{
	// 		// 失敗した時は未定
	// 	}
	//});
	
	pageDesigner.onTargetPageLoad = function iframe_loaded(event) {

		event.target.contentDocument.body.ondrop = function (dropevent) {
			// ドラッグされたデータのid名をDataTransferオブジェクトから取得
			var dragSrc = JSON.parse(dropevent.dataTransfer.getData("drag-data-toolitem"));
			var id_name = dragSrc.itemId;

			// 取得した情報からコントロールタグを構築			
			// タグの属性を受け取って表示する方式
			// 要素をオブジェクトとして扱い、任意の位置に差し込むなどの操作をするならこちらか。
			var newelement = document.createElement(dragSrc.ctrlData.tagName);
			for (var key in dragSrc.ctrlData.attrs) {
				newelement[key] = dragSrc.ctrlData.attrs[key];
			}			
			dropevent.target.appendChild(newelement);
			
			// タグテキストをそのまま設定
			//dropevent.target.innerHTML = dropevent.target.innerHTML + dragSrc.ctrlTagText;
			
			//エラー回避のため、ドロップ処理の最後にdropイベントをキャンセルしておく
			dropevent.preventDefault();

			// ローカルに保存
			//localStorage.setItem(id_name, JSON.stringify({ "id": id_name, "offsetx": 0, "offsety": 0 }));
			pageDesigner.localDb.addDeployedToolItems({toolItemId:id_name, offsetx:dropevent.offsetX, offsety:dropevent.offsetY});
			
			// 親に通知
			dropevent.target.ownerDocument.defaultView.parent.postMessage({
				"eventName":"toolItemSaved",
				"key":id_name
				}, "*");
		
			// Web Workerに通知する（iframe内で処理をすすめていってよいか？？）
			// var worker = new Worker("pageDesignerWorker.js");
			// worker.postMessage("toolItemNew");

		};

		event.target.contentDocument.body.ondragover = function (dragoverevent) {
			dragoverevent.preventDefault();
		};
	};
	
	pageDesigner.onSaveToolItemDeployed = function(event) {
		// ローカルのデータを取得
		// TODO: ES6使えるようになったら、arrow function と letで置き換える、ループ内のfunctionもなくす
		// もしくは、Babel
		pageDesigner.localDb.getAllDeployedToolItems(function(toolItems){
			console.log("done to get toolItems.", toolItems);
			for( var itemIndex in toolItems) {
				
				(function(index) {
					var item = toolItems[index];
					// 保存リクエストを送信
					pageDesigner.httpClient.postUrl("/~takashi/pagedesigner/prototype/mdl/newitem.json", JSON.stringify(item))
					.then(function(obj){
						// 保存完了したので、ローカルデータを消す
						pageDesigner.localDb.removeDeployedToolItem(item.toolItemId);
						
						// ローカルデータを保存したので色を元に戻す
						document.getElementById("saveToolItemDeployedButton").classList.remove("mdl-button--colored");
						
						console.log("succeeded to post!", obj, "saved!!");
					})
					.catch(function(e){
						console.log("failed to post data...", e);
					});
					
					
				})(itemIndex);
			
			}
			
		});
	};
	
	pageDesigner.httpClient = {
		postUrl: function (url, data) {
			return new Promise(function(resolve, reject) {
				var xhr = new XMLHttpRequest();
				xhr.open("POST", url);
				//xhr.responseType = 'json';
				xhr.onload = function() {
					if (xhr.status === 200) {
						resolve(xhr.responseText);
					}
					else {
						reject(new Error(xhr.statusText));
					}
				};
				xhr.onerror = function() {
					reject(new Error(xhr.statusText));
				};
				xhr.send(data);
			});
		}
	};
	
	pageDesigner.localDb = {
		dbName: "pageDesignerLocalDb",
		objectStoreName: "deployedToolItems",
		pageDesignerLocalDb: null,
		addDeployedToolItems: function(item) {
			// Chromeだと動くけど、Firefoxは、毎回DBをopenしないとうまくいかないため、毎回取る
			this.accessObjectStore(function(store){
				store.add(item);
				console.log("success : add : ", item);
			});
		},
		accessObjectStore: function(callback) {
			var idbReq = indexedDB.open(pageDesigner.localDb.dbName, 1);
			idbReq.onsuccess = function (event) {
				try {
					var transaction = idbReq.result.transaction([pageDesigner.localDb.objectStoreName], "readwrite");
					var store = transaction.objectStore(pageDesigner.localDb.objectStoreName);
					callback(store);
					
				} catch (error) {
					console.log(error);
				}
				console.log("success", event);
			};
			idbReq.onerror = function(event) {
				console.log(event);	
			};
			
		},
		getAllDeployedToolItems: function(callback) {
			var toolItems = [];
			this.accessObjectStore(function(store){
		    	store.openCursor().onsuccess = function (event) {
			        var cursor = event.target.result;
			        if (cursor) {
						toolItems.push({toolItemId:cursor.key, offsetx: cursor.value.offsetx, offsety: cursor.value.offsety})
			            console.log("cursor: ", "toolItemId:" + cursor.key + " value: " + cursor.value);
			            cursor.continue();
			        }else{
						callback(toolItems);
					}
			    };
			});
		},
		removeDeployedToolItem: function(key) {
			this.accessObjectStore(function(store){
				store.delete(key);
				console.log("success : delete : ", key);
			});
		},
		init: function() {
			
			// indexedDBを開く
			if(!pageDesigner.localDb.pageDesignerLocalDb) {
				
				//indexedDB.deleteDatabase( "pageDesignerLocalDb" );
				var idbReq = indexedDB.open(pageDesigner.localDb.dbName, 1);
				
				// DBの新規作成時、またはバージョン変更時に実行するコード
				idbReq.onupgradeneeded = function (event) {
				    var db = event.target.result;
				    db.createObjectStore(pageDesigner.localDb.objectStoreName, { keyPath: "toolItemId" });
					console.log("indexedDb createObjectStore : success", event);
				};
				
				idbReq.onerror = function (event) {
				    console.log("indexedDb open : error");
				};
				
				idbReq.onsuccess = function (event) {
					pageDesigner.localDb.pageDesignerLocalDb = idbReq.result;
					console.log("indexedDb open : success", event);
				};
				
			}
		}	
	};
		
	window.addEventListener("message", function(messageEvent){
		// postMessage時に入れた値がそのまま入る
		console.log(messageEvent.data.eventName, messageEvent.data.key);
		if(messageEvent.data.eventName === "toolItemSaved"){
			
			// 自動でサーバーへ保存するならこの辺りの契機で保存処理へ回す
			
			// 保存ボタンの色を変える、もしくはバッチを表示しても面白い
			document.getElementById("saveToolItemDeployedButton").classList.add("mdl-button--colored");
		}
	});
		
	// DB初期化
	pageDesigner.localDb.init();

})(pageDesignerGlobal);
