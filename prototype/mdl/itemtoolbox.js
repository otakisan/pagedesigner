/// <reference path="../../typings/angularjs/angular.d.ts"/>
(function () {
	angular.module('itemToolBoxLib', [])
		.directive('itemToolBox', function () {
		// templateUrlは、ディレクティブを呼び出しているページからの相対パス
		// ルートからの相対パスにして、どこからでも使えるようにする
		return {
			restrict: 'E',
			templateUrl: 'itemtoolbox.html',
			controller: ['$http', '$element', function ($http, $element) {
				// ケアレスミスを防ぐため、最初にthisを移し替えることをルールとしたほうがいいのかも
				var thisController = this;
			
				// コントロールアイテム
				//thisController.toolItems = {};
			
				// コントロールアイテムを取得
				$http.get('toolItems.json').success(function (data) {
					thisController.toolItems = data;
				});
				
				$element[0].ondragstart = function toolItem_dragstart(event) {
					// ドラッグするデータのid名をDataTransferオブジェクトにセット
					event.dataTransfer.setData(
						"drag-data-toolitem", 
						JSON.stringify(thisController.toolItems.items.filter(function(it){
							return it.itemId === event.target.attributes['data-pg-toolitemid'].value
							})[0]));
				};
			}],
			controllerAs: 'itemToolBoxController'
		};
	});
})();