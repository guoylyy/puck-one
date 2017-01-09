define(function (require, exports, module) {
	var chatPage = {
		init: function () {
			this.bindEvents();
			$.init();
		},
		bindEvents: function () {
			$('.chat-audio, .chat-text, .chat-material').on('click', this.onClickOption);
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
		}
	};
	chatPage.init();
});