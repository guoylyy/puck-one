define(function (require, exports, module) {
	var BASE_URL = 'http://stg-gambition.leanapp.cn';

	// 这里需要动态获取当前微信用户的信息
	var chatApp = {
		//mobilePhoneNumber: 'oHPV5v57NNFlk0Krwxpft5WRDk9o',
		//password: '$2a$13$x6nassMYeM6xHeXyzovBR.RMOSALOxHhwq09YYTXzpe0WF/oG9k1i',

		mobilePhoneNumber: 'oHPV5v_kuprY5R3NeX6hVyhgKmkE',
		password: '$2a$13$zol0k.bzDgefSGhQpBX/VOk.zlxuUJ3B1WNr81EW0p52CwqbUGRNa',

		loginUser: null,
		isTeacher: false,
		clazzId: null,
		studentId: null,

		hasInitChatPage: false,
		hasInitWeixinSDK: false,
		playVoiceAudio: null,

		initialize: function () {
			this.parseClazzId();
			this.initAjax();
			this.initPage();
			this.initLogin();
			this.initWeixinSDK();
		},
		parseClazzId: function () {
			var pathname = window.location.pathname,
				index = pathname.lastIndexOf('/');
			this.clazzId = pathname.slice(index + 1);
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
				},
				mLoading = false,
				mPaginator = {
					pageSize: 20,
					pageNumber: 1
				};

			$(document).on('pageInit', '#student-page', function(e, pageId, $page) {
				var isWaitingOnly = $.trim($('.student-nav .show-option').html()) == '查看全部' ? true : false;
				self.ajaxStudentList(null, null, isWaitingOnly).done(function (data, status, xhr) {
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

			$(document).on('refresh', '#chat-page .pull-to-refresh-content', function (e) {
				var startDate = null, pageSize = 5;

				if($('.chat-list .chat-item').length > 0) {
					var firstChatItem = $('.chat-list .chat-item').first();
					startDate = firstChatItem.data('date');
				}

				self.ajaxMessageList(pageSize, startDate).done(function (data, status, xhr) {
					if(data.code == 200) {
						var dataArr = data.data.replies;
						for(var i = dataArr.length - 1; i >= 0; i--) {
							self.addMessageHtml(dataArr[i], 'prepend');
						}
						$.pullToRefreshDone('#chat-page .pull-to-refresh-content');
					} else {
						$.toast('获取数据失败');
					}
				});
			});

			$(document).on('pageInit', '#material-page', function (e, pageId, $page) {
				self.ajaxMaterialList().done(function (data, status, xhr) {
					if(data.code == 200) {
						var dataArr = data.data.values,
							mPaginator = data.data.paginator;

						$('#material-page .list-block ul').empty().append([
							'<li class="list-title">',
								'<div class="item-content">',
					            	'<div class="item-inner">',
					              		'<div class="item-title">请选择素材发送</div>',
					            	'</div>',
					          	'</div>',
							'</li>'
						].join(''));

						$.each(dataArr, function (index, item) {
							var html = Mustache.render(self.materialContentTpl, {item: item});
						  	$('#material-page .list-block ul').append(html);
						});

						if(mPaginator.pageNumber >= mPaginator.totalPageNum) {
							$.detachInfiniteScroll($('.material-list.infinite-scroll'));
                  			$('.material-list .infinite-scroll-preloader').remove();
						}
					} else {
						$.toast('获取数据失败');
					}
				});
			});

			$(document).on('infinite', '.material-list', function () {
				if(mLoading) return;
				if(mPaginator.pageNumber >= mPaginator.totalPageNum) return;

				mLoading = true;
				mPaginator.pageNumber++;

				self.ajaxMaterialList(mPaginator.pageNumber, mPaginator.pageSize).done(function (data, status, xhr) {
					if(data.code == 200) {
						var dataArr = data.data.values, 
							mPaginator = data.data.paginator;

						$.each(dataArr, function (index, item) {
						  	var html = Mustache.render(self.materialContentTpl, {item: item});
						  	$('#material-page .list-block ul').append(html);
						});

						if(mPaginator.pageNumber >= mPaginator.totalPageNum) {
							$.detachInfiniteScroll($('.material-list.infinite-scroll'));
                  			$('.material-list .infinite-scroll-preloader').remove();
						}
					} else {
						$.toast('获取数据失败');
					}
					mLoading = false;
					$.refreshScroller();
				});
			});
		},
		initPageHtml: function () {
			var self = this;

			if(self.isTeacher) {
				$.router.load('#student-page');

				$('#chat-page .bar-nav').prepend([
					'<a class="button button-link button-nav pull-left chat-page-back">',
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
		resetChatPageHtml: function () {
			var $list = $('#chat-page .chat-list'), $footer = $('#chat-page .chat-footer');

			$list.empty();
			$footer.removeClass('chat-text-active chat-audio-active chat-material-active');
			$footer.find('.chat-audio, .chat-text, .chat-material').removeClass('active');

			$footer.find('.text-input-section input').val('');
			$footer.find('.audio-input-section').removeClass('active');
		},
		initWeixinSDK: function () {
			var self = this;

			self.ajaxWeixinSDK().done(function (data, status, xhr) {
				if(data.code == 200) {
					var params = $.extend(data.data, {
						//debug: true,
						jsApiList: [
							'startRecord',
							'stopRecord',
							'onVoiceRecordEnd',
							'playVoice',
							'pauseVoice',
							'stopVoice',
							'onVoicePlayEnd',
							'uploadVoice',
							'downloadVoice'
						]
					});
					delete params.jsapi_ticket;
					delete params.url;
					wx.config(params);

					wx.ready(function () {
						self.hasInitWeixinSDK = true;
						self.bindVoiceRecordEvents();
					});
					wx.error(function (res) {
						self.hasInitWeixinSDK = false;
						$.toast('微信鉴权失败');
					});
				} else {
					$.toast('获取数据失败');
				}
			});
		},
		bindEvents: function () {
			var self = this;

			$('.chat-audio, .chat-text, .chat-material').on('click', this.onClickChatOption);

			$('.text-input-section .button').on('click', $.proxy(self.onClickSendTextBtn, self));

			$('.chat-list').on('click', '.chat-audio-msg .audio-bar', $.proxy(self.onClickVoiceItem, self));

			if(self.isTeacher) {
				$('.student-nav .show-option').on('click', $.proxy(self.onClickStudentShowOption, self));
				$('.student-list .list-block').on('click', '.item-link', $.proxy(self.onClickStudentItem, self));
				$('.chat-nav .chat-page-back').on('click', $.proxy(self.onClickChatBack, self));
				$('.material-list .list-block').on('click', 'li', $.proxy(self.onClickMaterialItem, self));
			}

			$('#search').on('focus', function () {
				setTimeout(function() {
    				document.body.scrollTop = document.body.scrollHeight
				}, 600);
			});
		},
		bindVoiceRecordEvents: function () {
			var self = this,
				$audioInputSection = $('.audio-input-section'),
				$recordTip = $('.audio-input-section .record-tip'),
				$recordStatus = $('.audio-input-section .record-status'),
				$recordBtn = $('.audio-input-section .record-btn'),
				$cancelBtn = $('.audio-input-section .cancel-btn'),
				localId, recordTimer;

			if(!localStorage.allowRecord || localStorage.allowRecord !== 'true'){
			    wx.startRecord({
			        success: function(){
			            localStorage.allowRecord = 'true';
			            wx.stopRecord();
			        },
			        cancel: function () {
			            alert('用户拒绝授权录音');
			        }
			    });
			}

			var resetRecord = function (status) {
				$audioInputSection.removeClass('active');
				$recordBtn.removeClass(status).addClass('start');
				$recordTip.text('');
				$recordStatus.text('点击开始录音');
			};

			var stopRecord = function () {
				wx.stopRecord({
					success: function (res) {
						localId = res.localId;

						recordTimer && clearTimeout(recordTimer);

						$recordBtn.removeClass('record').addClass('send');
						$recordStatus.text('点击发送');
					},
					fail: function () {
						$.toast('结束录音失败');
						resetRecord('record');
					}
				});
			};

			$recordBtn.on('click', function (event) {
				if(!self.hasInitWeixinSDK || (!localStorage.allowRecord || localStorage.allowRecord !== 'true')) return;

				if($recordBtn.hasClass('start')) {
					wx.startRecord({
						success: function (res) {
							$audioInputSection.addClass('active');

							$recordBtn.removeClass('start').addClass('record');
							$recordTip.text('满60s自动发送');
							$recordStatus.text('录音中');

							recordTimer = setTimeout(function () {
								stopRecord();
							}, 59000);
						},
						fail: function () {
							$.toast('开始录音失败');
						}
					});
				} else if($recordBtn.hasClass('record')) {
					stopRecord();
				} else if($recordBtn.hasClass('send')) {
					wx.uploadVoice({
					    localId: localId,
					    isShowProgressTips: 1,
				        success: function (res) {
					    	self.ajaxSendMessage({
								replyType: 'VOICE',
								mediaId: res.serverId
							})
							.done(function (data, status, xhr) {
								if(data.code == 200) {
									self.addMessageHtml(data.data);

								} else {
									$.toast('发送语音失败');
								}

								resetRecord('send');
							})
							.fail(function () {
								$.toast('发送语音失败');
								resetRecord('send');
							});
					    },
					    fail: function () {
					    	$.toast('上传语音失败');
					    	resetRecord('send');
					    }
					});
				}
			});

			$cancelBtn.on('click', function (event) {
				if($recordBtn.hasClass('record')) {
					recordTimer && clearTimeout(recordTimer);
					wx.stopRecord();
					resetRecord('record');
				} else if($recordBtn.hasClass('send')) {
					resetRecord('send');
				}
			});
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
			var self = this, target = event.currentTarget;
			
			self.studentId = $(target).data('id');
			self.hasInitChatPage = false;

			setTimeout(function () {
				$.router.load('#chat-page');
			}, 200);
		},
		onClickStudentShowOption: function (event) {
			var self = this, $target = $(event.currentTarget), isWaitingOnly = true;

			isWaitingOnly = $.trim($target.html()) == '查看全部' ? false : true;

			self.ajaxStudentList(null, null, isWaitingOnly).done(function (data, status, xhr) {
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
					} else {
						if($('.student-list .infinite-scroll-preloader').length == 0) {
							$('.student-list').append([
								'<div class="infinite-scroll-preloader">',
              						'<div class="preloader"></div>',
          						'</div>'
							].join(''));
						}
						$.attachInfiniteScroll($('.student-list.infinite-scroll'));
					}

					$target.html(isWaitingOnly ? '查看全部' : '只看未回复');
				} else {
					$.toast('获取数据失败');
				}
			});
		},
		onClickChatBack: function () {
			this.resetChatPageHtml();

			if(this.playVoiceAudio && !this.playVoiceAudio.paused) {
				this.playVoiceAudio.pause();
			}

			$.router.load('#student-page');
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
					$.router.load('#chat-page');
					setTimeout(function () {
						self.addMessageHtml(data.data);
					}, 200);
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
		onClickVoiceItem: function (event) {
			var self = this, 
				$target = $(event.currentTarget),
				$status = $target.find('i'),
				audioStatus = $status.hasClass('icon-chat-play') ? 'pause' : 'play';
				audioUrl = $target.data('url');

			if(!self.playVoiceAudio) 
				self.playVoiceAudio = $('#playVoiceAudio').get(0);

			var playVoiceAudio = self.playVoiceAudio,
				playVoiceAudioSource = $('#playVoiceAudio source').get(0);

			if(audioStatus == 'pause') {
				playVoiceAudioSource.src = audioUrl;
				playVoiceAudio.load();
				
				var playPromise = playVoiceAudio.play();
				if(playPromise != null) {
					playPromise.catch(function () {});
				}
				(function ($el) {
					playVoiceAudio.addEventListener('ended', function () {
						$el.removeClass('icon-chat-pause').addClass('icon-chat-play');
					});
				})($status);

				$('.chat-audio-msg .audio-bar i').removeClass('icon-chat-pause').addClass('icon-chat-play');
				$status.addClass('icon-chat-pause').removeClass('icon-chat-play');
			} else {
				playVoiceAudio.pause();

				$status.removeClass('icon-chat-pause').addClass('icon-chat-play');
			}
		},
		ajaxLogin: function () {
			return $.ajax({
				type: 'POST',
				url: 'http://stg-gambition.leanapp.cn' + '/api/mng/auth',
				data: {
					mobilePhoneNumber: this.mobilePhoneNumber,
					password: this.password
				},
				dataType: 'json'
			});
		},
		ajaxCheckTeacher: function () {
			return $.ajax({
				type: 'GET',
				url: BASE_URL + '/api/course/' + this.clazzId + '/isTeacher',
				dataType: 'json'
			});
		},
		ajaxStudentList: function (pageNumber, pageSize, isWaitingOnly) {
			var pNum = pageNumber || 1, pSize = pageSize || 20, isWaitingOnly = isWaitingOnly ? true : false;

			return $.ajax({
				type: 'GET',
				url: BASE_URL + '/api/course/' + this.clazzId + '/feedbacks?pageNumber=' + pNum + '&pageSize=' + pSize + '&isWaitingOnly=' + isWaitingOnly,
				dataType: 'json'
			});
		},
		ajaxMessageList: function (pageSize, startDate) {
			var pSize = pageSize || 5, sDate = startDate || null;

			var url = this.isTeacher ? (BASE_URL + '/api/course/' + this.clazzId + '/feedback/' + this.studentId) : (BASE_URL + '/api/course/' + this.clazzId + '/feedback');

			url += '?pageSize=' + pSize + (sDate ? ('&startDate=' + startDate) : '');

			return $.ajax({
				type: 'GET',
				url: url,
				dataType: 'json'
			});
		},
		ajaxMaterialList: function (pageNumber, pageSize) {
			var pNum = pageNumber || 1, pSize = pageSize || 20;

			return $.ajax({
				type: 'GET',
				url: BASE_URL + '/api/course/' + this.clazzId + '/feedback/materials?pageNumber=' + pNum + '&pageSize=' + pSize,
				dataType: 'json'
			});
		},
		ajaxSendMessage: function (data) {
			var url = this.isTeacher ? (BASE_URL + '/api/course/' + this.clazzId + '/feedback/' + this.studentId) : (BASE_URL + '/api/course/' + this.clazzId + '/feedback');

			return $.ajax({
				type: 'POST',
				url: url,
				data: data,
				dataType: 'json'
			});
		},
		ajaxWeixinSDK: function () {
			return $.ajax({
				type: 'GET',
				url: BASE_URL + '/api/wechat/jsSdkAuth?url=' + window.location.pathname,
				dataType: 'json'
			});
		},
		addMessageHtml: function (item, direction) {
			var self = this, 
				$content = $('#chat-page .content'),
				$list = $('#chat-page .chat-list'), 
				dir = direction || 'append';

			item.date = item.date.slice(0, 10) + ' ' + item.date.slice(11, 19);

			switch(item.type) {
				case 'TEXT':
					$list[dir](Mustache.render(self.textMsgTpl, {item: item}));
				break;
				case 'VOICE':
					$list[dir](Mustache.render(self.audioMsgTpl, {item: item}));
				break;
				case 'MATERIAL':
					$list[dir](Mustache.render(self.materialMsgTpl, {item: item, clazzId: self.clazzId}));
				break;
			}

			$content.scroller('refresh');
			if(dir == 'append') {
				$content.scrollTop($content[0].scrollHeight);
			}
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
			'<div class="chat-item {{#item.userInfo.isSelf}}me{{/item.userInfo.isSelf}}" data-date="{{item.date}}">',
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
			'<div class="chat-item {{#item.userInfo.isSelf}}me{{/item.userInfo.isSelf}}" data-date="{{item.date}}">',
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
					'<div class="chat-audio-msg" data-id="{{item.id}}">',
						'<div class="audio-bar" data-url="{{item.url}}">',
							'<i class="icon-chat icon-chat-play"></i>',
						'</div>',
					'</div>',
				'</div>',
			'</div>'
		].join(''),
		materialMsgTpl: [
			'<div class="chat-item {{#item.userInfo.isSelf}}me{{/item.userInfo.isSelf}}" data-date="{{item.date}}">',
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
					'<a href="/weh5/course/{{clazzId}}/feedbackMaterial/{{item.materialId}}" class="chat-material-msg">',
						'<div class="material-title">{{item.title}}</div>',
						'<div class="material-line"></div>',
						'<div class="material-author">作者: {{item.author}}<i class="icon icon-right"></i></div>',
					'</a>',
				'</div>',
			'</div>'
		].join('')
	};

	chatApp.initialize();
});