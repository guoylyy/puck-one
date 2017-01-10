define(function (require, exports, module) {
	var chatPage = {
		initialize: function () {
			this.initConversation();
			$.init();
		},
		initConversation: function () {
			var self = this;

			// 初始化存储 SDK
			AV.init({
			  	appId: 'XJroNb2m8eHOGobg6WKN16K6-gzGzoHsz', 
			  	appKey:'rGGy6ziKb0uxnfrwp6T37gmK',
			});
			// 初始化实时通讯 SDK
			var Realtime = AV.Realtime;
			var realtime = new Realtime({
			  	appId: 'XJroNb2m8eHOGobg6WKN16K6-gzGzoHsz',
			  	region: 'cn',
			  	plugins: [AV.TypedMessagesPlugin], // 注册富媒体消息插件
			});

			/*
				需要替换为实际进行对话的用户的唯一标识
			 */
			var clientID1 = 'Oliver', clientID2 = 'Mikey';
			realtime.createIMClient(clientID1).then(function (currClient) {
				return currClient.createConversation({
					members: [clientID2],
					name: clientID1 + '&' + clientID2,
					unique: true
				});
			}).then(function (conversation) {
				self.conversation = conversation;
				conversation.on('message', function (message) {
					switch(message.type) {
						case AV.TextMessage.TYPE:
							if(message.from != clientID1)
								self.addMessage(message.getText(), message.type, false);
						break;
					}
				});
				self.bindEvents();
			}).catch(console.error);
		},
		addMessage: function (content, type, fromMe) {
			var self = this;
			switch(type) {
				case AV.TextMessage.TYPE:
					var html = Mustache.render(self.textMsgTpl, {text: content}),
						$html = fromMe ? $(html).addClass('me') : $(html);
					$('.chat-list').append($html);
					$('.chat-list').scrollTop($('.chat-list').get(0).scrollHeight);
				break;
			}
		},
		bindEvents: function () {
			var self = this;
			$('.chat-audio, .chat-text, .chat-material').on('click', this.onClickOption);
			$('.text-input-section .button').on('click', function () {
				self.onClickSendTextBtn.apply(self, arguments);
			});
		},
		onClickOption: function (event) {
			var target = event.currentTarget, 
				$target = $(target), $parent = $target.closest('.chat-footer'),
				classList = 'chat-audio-active chat-text-active chat-material-active';

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
		onClickSendTextBtn: function (event) {
			var self = this, 
				$input = $('.text-input-section input'), 
				text = $.trim($input.val());

			if(text.length == 0) {
				$input.val('');
				return;
			}

			self.conversation.send(new AV.TextMessage(text)).then(function (message) {
				self.addMessage(message.getText(), message.type, true);
				$input.val('');
			}).catch(console.error);
		},
		textMsgTpl: [
			'<div class="chat-item">',
				'<div class="chat-avatar">',
					'<img src="./src/img/default-avatar.png">',
				'</div>',
				'<div class="chat-content">',
					'<div class="chat-user">',
						'<span class="chat-user-name">XXX</span>',
						'<span class="chat-user-title">XX</span>',
					'</div>',
					'<div class="chat-text-msg">',
						'<p>{{text}}</p>',
					'</div>',
				'</div>',
			'</div>'
		].join('')
	};
	chatPage.initialize();
});