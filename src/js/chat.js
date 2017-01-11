define(function (require, exports, module) {
	var BASE_URL = 'http://stg-gambition.leanapp.cn';

	// 这里需要动态获取当前微信用户的信息
	
		var mobilePhoneNumber = 'oHPV5v_kuprY5R3NeX6hVyhgKmkE',
		password = '$2a$13$zol0k.bzDgefSGhQpBX/VOk.zlxuUJ3B1WNr81EW0p52CwqbUGRNa';
	

	/*
		var mobilePhoneNumber = 'oHPV5v57NNFlk0Krwxpft5WRDk9o',
		password = '$2a$13$x6nassMYeM6xHeXyzovBR.RMOSALOxHhwq09YYTXzpe0WF/oG9k1i';
	*/	

	var chatApp = {
		loginUser: null,
		isTeacher: false,
		clazzId: '584bbb8f2f301e005724eb38',
		studentId: null,
		hasInitChatPage: false,

		initialize: function () {
			this.initAjax();
			this.initPage();
			this.initLogin();
		},
		initAjax: function () {
			$(document).on('ajaxSend', function () {
				$.showIndicator();
			});
			$(document).on('ajaxComplete', function () {
				$.hideIndicator();
			});
			$(document).on('ajaxError', function () {
				$.toast('请求失败');
			});
		},
		initLogin: function () {
			var self = this;

			self.ajaxLogin().done(function (data, status, xhr) {
				if(data.code == 200) {
					self.loginUser = data.data;
					
					self.ajaxCheckTeacher().done(function (data, status, xhr) {
						if(data.code == 200) {
							self.isTeacher = data.data.isTeacher;
							self.initPageHtml();
						} else {
							$.toast('获取数据失败');
						}
					});
				} else {
					$.toast('获取数据失败');
				}
			});
		},
		initPage: function () {
			var self = this, 
				sLoading = false,
				sPaginator = {
					pageSize: 20,
					pageNumber: 1
				};

			$(document).on('pageInit', '#student-page', function(e, pageId, $page) {
				self.ajaxStudentList().done(function (data, status, xhr) {
					if(data.code == 200) {
						var dataArr = data.data.values, 
							sPaginator = data.data.paginator, 
							$ul = $('<ul></ul>');

						$.each(dataArr, function (index, item) {
							item.status.key = item.status.key.toLowerCase();
						  	var html = Mustache.render(self.studentFeedbackTpl, {id: item.id, userInfo: item.userInfo, status: item.status});
							$ul.append(html);
						});
						
						$('#student-page .list-block').empty().append($ul);

						if(sPaginator.pageNumber >= sPaginator.totalPageNum) {
							$.detachInfiniteScroll($('.student-list.infinite-scroll'));
                  			$('.student-list .infinite-scroll-preloader').remove();
						}
					} else {
						$.toast('获取数据失败');
					}
				});
			});

			$(document).on('infinite', '.student-list', function () {
				if(sLoading) return;
				if(sPaginator.pageNumber >= sPaginator.totalPageNum) return;

				sLoading = true;
				sPaginator.pageNumber++;

				self.ajaxStudentList(sPaginator.pageNumber, sPaginator.pageSize).done(function (data, status, xhr) {
					if(data.code == 200) {
						var dataArr = data.data.values, 
							sPaginator = data.data.paginator;

						$.each(dataArr, function (index, item) {
							item.status.key = item.status.key.toLowerCase();
						  	var html = Mustache.render(self.studentFeedbackTpl, {id: item.id, userInfo: item.userInfo, status: item.status});
							$('#student-page .list-block ul').append(html);
						});

						if(sPaginator.pageNumber >= sPaginator.totalPageNum) {
							$.detachInfiniteScroll($('.student-list.infinite-scroll'));
                  			$('.student-list .infinite-scroll-preloader').remove();
						}
					} else {
						$.toast('获取数据失败');
					}
					sLoading = false;
					$.refreshScroller();
				});
			});

			$(document).on('pageInit', '#chat-page', function (e, pageId, $page) {
				if(!self.hasInitChatPage) {
					self.ajaxMessageList().done(function (data, status, xhr) {
						if(data.code == 200) {
							var dataArr = data.data.replies;
							$.each(dataArr, function (index, item) {
								self.addMessageHtml(item);
							});
						} else {
							$.toast('获取数据失败');
						}
					});
					self.hasInitChatPage = true;
				}
			});

			$(document).on('pageInit', '#material-page', function (e, pageId, $page) {
				self.ajaxMaterialList().done(function (data, status, xhr) {
					if(data.code == 200) {
						var dataArr = data.data.values;
						$.each(dataArr, function (index, item) {
							var html = Mustache.render(self.materialContentTpl, {item: item});
						  	$('#material-page ul').append(html);
						});
					} else {
						$.toast('获取数据失败');
					}
				});
			});
		},
		initPageHtml: function () {
			var self = this;

			if(self.isTeacher) {
				$.router.load('#student-page');

				$('#chat-page .bar-nav').prepend([
					'<a class="button button-link button-nav pull-left" href="#student-page">',
			      		'<span class="icon icon-left"></span>',
			    	'</a>'
				].join(''));

				$('#chat-page .bar-footer').prepend([
					'<div class="row">',
					'	<div class="col-33 chat-audio"><i class="icon-chat icon-chat-microphone"></i>语音</div>',
					'	<div class="col-33 chat-text"><i class="icon-chat icon-chat-keyboard"></i>文字</div>',
					'	<div class="col-33 chat-material"><i class="icon-chat icon-chat-menu"></i>素材</div>',
					'</div>'
				].join(''));
			} else {
				$.router.load('#chat-page');

				$('#chat-page .bar-footer').prepend([
					'<div class="row">',
					'	<div class="col-50 chat-audio"><i class="icon-chat icon-chat-microphone"></i>语音</div>',
					'	<div class="col-50 chat-text"><i class="icon-chat icon-chat-keyboard"></i>文字</div>',
					'</div>'
				].join(''));
			}

			self.bindEvents();
		},
		bindEvents: function () {
			var self = this;

			$('.chat-audio, .chat-text, .chat-material').on('click', this.onClickChatOption);

			$('.text-input-section .button').on('click', $.proxy(self.onClickSendTextBtn, self));

			if(self.isTeacher) {
				$('.student-list .list-block').on('click', '.item-link', $.proxy(self.onClickStudentItem, self));
				$('.material-list .list-block').on('click', 'li', $.proxy(self.onClickMaterialItem, self));
			}
		},
		onClickChatOption: function (event) {
			var target = event.currentTarget, 
				$target = $(target), $parent = $target.closest('.chat-footer'),
				classList = 'chat-audio-active chat-text-active chat-material-active';

			if($target.hasClass('chat-material')) {
				$.router.load('#material-page');
				return;
			}

			if (!$target.hasClass('active')) {
				$target.siblings().removeClass('active');
				$target.addClass('active');

				$parent.removeClass(classList);
				if($target.hasClass('chat-text')) {
					$parent.addClass('chat-text-active');
				} else if ($target.hasClass('chat-audio')) {
					$parent.addClass('chat-audio-active');
				}
			} else {
				$target.removeClass('active');
				$parent.removeClass(classList);
			}
		},
		onClickStudentItem: function (event) {
			var self = this, target = event.currentTarget, $list = $('#chat-page .chat-list');
			
			self.studentId = $(target).data('id');
			self.hasInitChatPage = false;

			$list.empty();
			$.router.load('#chat-page', true);
		},
		onClickMaterialItem: function (event) {
			var self = this, target = event.currentTarget;
			
			if($(target).hasClass('list-title')) return;

			self.ajaxSendMessage({
				replyType: 'MATERIAL',
				materialId: $(target).data('id')
			})
			.done(function (data, status, xhr) {
				if(data.code == 200) {
					self.addMessageHtml(data.data);
					$.router.load('#chat-page');
				} else {
					$.toast('发送数据失败');
				}
			});
		},
		onClickSendTextBtn: function (event) {
			var self = this, 
				$input = $('.text-input-section input'), 
				text = $.trim($input.val());

			if(text.length == 0) {
				$input.val('');
				return;
			}

			self.ajaxSendMessage({
				replyType: 'TEXT',
				content: $input.val()
			})
			.done(function (data, status, xhr) {
				if(data.code == 200) {
					self.addMessageHtml(data.data);
					$input.val('');
				} else {
					$.toast('发送数据失败');
				}
			});
		},
		ajaxLogin: function () {
			return $.ajax({
				type: 'POST',
				url: BASE_URL + '/api/mng/auth',
				data: {
					mobilePhoneNumber: mobilePhoneNumber,
					password: password
				},
				dataType: 'json'
			});
		},
		ajaxCheckTeacher: function () {
			return $.ajax({
				type: 'GET',
				url: BASE_URL + '/weh5/course/' + this.clazzId + '/isTeacher',
				dataType: 'json'
			});
		},
		ajaxStudentList: function (pageNumber, pageSize) {
			var pNum = pageNumber || 1, pSize = pageSize || 20;

			return $.ajax({
				type: 'GET',
				url: BASE_URL + '/weh5/course/' + this.clazzId + '/feedbacks?pageNumber=' + pNum + '&pageSize=' + pSize,
				dataType: 'json'
			});
		},
		ajaxMessageList: function () {
			var url = this.isTeacher ? (BASE_URL + '/weh5/course/' + this.clazzId + '/feedback/' + this.studentId) : (BASE_URL + '/weh5/course/' + this.clazzId + '/feedback');

			return $.ajax({
				type: 'GET',
				url: url,
				dataType: 'json'
			});
		},
		ajaxMaterialList: function () {
			return $.ajax({
				type: 'GET',
				url: BASE_URL + '/weh5/course/' + this.clazzId + '/feedback/materials',
				dataType: 'json'
			});
		},
		ajaxSendMessage: function (data) {
			var url = this.isTeacher ? (BASE_URL + '/weh5/course/' + this.clazzId + '/feedback/' + this.studentId) : (BASE_URL + '/weh5/course/' + this.clazzId + '/feedback');

			return $.ajax({
				type: 'POST',
				url: url,
				data: data,
				dataType: 'json'
			});
		},
		addMessageHtml: function (item) {
			var self = this, $list = $('#chat-page .chat-list');

			switch(item.type) {
				case 'TEXT':
					$list.append(Mustache.render(self.textMsgTpl, {item: item}));
				break;
				case 'MATERIAL':
					$list.append(Mustache.render(self.materialMsgTpl, {item: item}));
				break;
			}
			$list.scrollTop($list.get(0).scrollHeight);
		},
		studentFeedbackTpl: [
			'<li>',
				'<a class="item-link item-content" data-id="{{id}}">',
					'<div class="item-media">',
						'<img src="{{userInfo.headimgurl}}">',
					'</div>',
					'<div class="item-inner">',
         	 			'<div class="item-title">{{userInfo.name}}</div>',
         	 			'<div class="item-after {{status.key}}">{{status.name}}</div>',
					'</div>',
				'</a>',
			'</li>'
		].join(''),
		materialContentTpl: [
			'<li data-id="{{item.objectId}}">',
	          	'<div class="item-content">',
	            	'<div class="item-inner">',
	              		'<div class="item-title">{{item.title}}</div>',
	            		'<div class="item-after">{{item.author}}</div>',
	            	'</div>',
	          	'</div>',
	        '</li>'
		].join(''),
		textMsgTpl: [
			'<div class="chat-item {{#item.userInfo.isSelf}}me{{/item.userInfo.isSelf}}">',
				'<div class="chat-avatar">',
					'<img src="{{item.userInfo.headimgurl}}">',
				'</div>',
				'<div class="chat-content">',
					'<div class="chat-user">',
						'{{#item.userInfo.isTeacher}}',
						'<span class="chat-user-name">{{item.userInfo.name}}</span>',
						'<span class="chat-user-title">笃师</span>',
						'{{/item.userInfo.isTeacher}}',
					'</div>',
					'<div class="chat-text-msg">',
						'<p>{{item.content}}</p>',
					'</div>',
				'</div>',
			'</div>'
		].join(''),
		audioMsgTpl: [

		].join(''),
		materialMsgTpl: [
			'<div class="chat-item {{#item.userInfo.isSelf}}me{{/item.userInfo.isSelf}}">',
				'<div class="chat-avatar">',
					'<img src="{{item.userInfo.headimgurl}}">',
				'</div>',
				'<div class="chat-content">',
					'<div class="chat-user">',
						'{{#item.userInfo.isTeacher}}',
						'<span class="chat-user-name">{{item.userInfo.name}}</span>',
						'<span class="chat-user-title">笃师</span>',
						'{{/item.userInfo.isTeacher}}',
					'</div>',
					'<div class="chat-material-msg">',
						'<div class="material-title">{{item.title}}</div>',
						'<div class="material-line"></div>',
						'<div class="material-author">作者: {{item.author}}<i class="icon icon-right"></i></div>',
					'</div>',
				'</div>',
			'</div>'
		].join('')
	};

	chatApp.initialize();
});