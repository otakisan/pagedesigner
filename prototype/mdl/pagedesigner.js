//"use strict";

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
			//alert("drop!");
			//ドラッグされたデータのid名をDataTransferオブジェクトから取得
			//var id_name = event.dataTransfer.getData("text");
			//var _target = dropevent.target;
			var dragSrc = JSON.parse(dropevent.dataTransfer.getData("text"));
			// dropevent.dataTransfer.items[0].getAsString(function (data) {
			// 	console.log(data);
			
			// 	var id_name = dragSrc.id;
			// 	var newelement = document.createElement("div");
			// 	newelement.textContent = id_name;
			// 	//ドロップ先にドラッグされた要素を追加
			// 	_target.appendChild(newelement);

			// }, false);
			// var dragSrc = JSON.parse(dropevent.dataTransfer.getData("text"));
			var id_name = dragSrc.id;
			//id名からドラッグされた要素を取得
			//var drag_elm =document.getElementById(id_name);
			var newelement = document.createElement("div");
			newelement.textContent = id_name;
			//ドロップ先にドラッグされた要素を追加
			dropevent.target.appendChild(newelement);
			//エラー回避のため、ドロップ処理の最後にdropイベントをキャンセルしておく
			dropevent.preventDefault();
		
			// Web Storageに保存
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

	pageDesigner.onToolItemDragstart = function toolItem_dragstart(event) {
		//ドラッグするデータのid名をDataTransferオブジェクトにセット
		event.dataTransfer.setData("text", JSON.stringify({ "id": event.target.textContent, "value": "testvalue1" }));
	};
	
	pageDesigner.onSaveToolItemDeployed = function(event) {
		// ローカルのデータを取得
		pageDesigner.localDb.getAllDeployedToolItems(function(toolItems){
			console.log("done to get toolItems.", toolItems);
			for( var itemIndex in toolItems) {
				
				(function(index) {
					var item = toolItems[index];
					// 保存リクエストを送信
					pageDesigner.httpClient.postUrl("/~takashi/ddsample/mdl/newitem.json", item)
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
		pageDesignerLocalDb: null,
		// deployedToolItemsStore: null,
		// idbReq: null,
		// addDeployedToolItems: function(item) {
		// 	// if (!pageDesigner.localDb.pageDesignerLocalDb) {
		// 	// 	pageDesigner.localDb.init();
		// 	// }
			
		// 	var db = pageDesigner.localDb.pageDesignerLocalDb;
		//     var transaction = db.transaction(["deployedToolItems"], "readwrite");
		// 	try {
		// 	var store = transaction.objectStore("deployedToolItems");
		// 	store.add(item);
				
		// 	} catch (error) {
		// 		console.log(error);
		// 	}
			
		// },
		addDeployedToolItems: function(item) {
			// var idbReq = indexedDB.open("pageDesignerLocalDb", 1);
			// idbReq.onsuccess = function (event) {
			// 	//pageDesigner.localDb.pageDesignerLocalDb = idbReq.result;
			// 	try {
			// 		var transaction = idbReq.result.transaction(["deployedToolItems"], "readwrite");
			// 		var store = transaction.objectStore("deployedToolItems");
			// 		store.add(item);
			// 		console.log("success : add : ", item);
			// 	} catch (error) {
			// 		console.log(error);
			// 	}
			// 	console.log("success", event);
			// };
			this.accessObjectStore(function(store){
				store.add(item);
				console.log("success : add : ", item);
			});
		},
		accessObjectStore: function(callback) {
			var idbReq = indexedDB.open("pageDesignerLocalDb", 1);
			idbReq.onsuccess = function (event) {
				//pageDesigner.localDb.pageDesignerLocalDb = idbReq.result;
				try {
					var transaction = idbReq.result.transaction(["deployedToolItems"], "readwrite");
					var store = transaction.objectStore("deployedToolItems");
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
		// getAllDeployedToolItems: function() {
		// 	//"twitter", "pocket"2つのオブジェクトストアを読み書き権限付きで使用することを宣言
		// 	var db = pageDesigner.localDb.pageDesignerLocalDb;
		//     var transaction = db.transaction(["deployedToolItems"], "readwrite");
		
		//     //各オブジェクトストアの取り出し
		//     var twitterStore = transaction.objectStore("deployedToolItems");
		
		//     //twitterオブジェクトストアから全データの取り出し
		// 	var toolItems = [];
		//     twitterStore.openCursor().onsuccess = function (event) {
		//         var cursor = event.target.result;
		//         if (cursor) {
		// 			toolItems.push({toolItemId:cursor.key, offsetx: cursor.value.offsetx, offsety: cursor.value.offsety})
		//             console.log("toolItemId:" + cursor.key + " value: " + cursor.value);
		//             cursor.continue();
		//         }
		//     };
			
		// 	return toolItems;
		// },
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
			
			//return toolItems;
		},
		// removeDeployedToolItem: function(key) {
		// 	var db = pageDesigner.localDb.pageDesignerLocalDb;
		//     var transaction = db.transaction(["deployedToolItems"], "readwrite");
		// 	var store = transaction.objectStore("deployedToolItems");
		// 	store.delete(key);
		// },
		removeDeployedToolItem: function(key) {
			this.accessObjectStore(function(store){
				store.delete(key);
				console.log("success : delete : ", key);
			});
		},
		init: function() {
			
			//2.indexedDBを開く
			if(!pageDesigner.localDb.pageDesignerLocalDb) {
				
				//indexedDB.deleteDatabase( "pageDesignerLocalDb" );
				var idbReq = indexedDB.open("pageDesignerLocalDb", 1);
				
				//3.DBの新規作成時、またはバージョン変更時に実行するコード
				idbReq.onupgradeneeded = function (event) {
				    var db = event.target.result;
				    db.createObjectStore("deployedToolItems", { keyPath: "toolItemId" });
				
				    //データの追加
				    //twitterStore.add({ toolItemId: "1", text: "test" });
				};
				
				idbReq.onerror = function (event) {
				    console.log("error");
				};
				
				idbReq.onsuccess = function (event) {
					pageDesigner.localDb.pageDesignerLocalDb = idbReq.result;
					try {
						var transaction = pageDesigner.localDb.pageDesignerLocalDb.transaction(["deployedToolItems"], "readwrite");
						var store = transaction.objectStore("deployedToolItems");
						console.log(store);
					} catch (error) {
						console.log(error);
					}
					console.log("success", event);
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
	
				pageDesigner.localDb.init();


})(pageDesignerGlobal);
