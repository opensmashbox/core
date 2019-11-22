/*
 * Copyright (c) 2015
 *
 * This file is licensed under the Affero General Public License version 3
 * or later.
 *
 * See the COPYING-README file.
 *
 */

(function() {
	if (!OC.Share) {
		OC.Share = {};
	}

	var TEMPLATE =
			'<ul id="shareWithList" class="shareWithList">' +
			'{{#each sharees}}' +
			'<li data-share-id="{{shareId}}" data-share-type="{{shareType}}" data-share-with="{{shareWith}}">' +
			'<a href="#" class="unshare"><span class="icon-loading-small hidden"></span><span class="icon icon-delete"></span><span class="hidden-visually">{{unshareLabel}}</span></a>' +
			'{{#if avatarEnabled}}' +
			'<div class="avatar {{#if modSeed}}imageplaceholderseed{{/if}}" data-username="{{shareWith}}" {{#if modSeed}}data-seed="{{shareWith}} {{shareType}}"{{/if}}></div>' +
			'{{/if}}' +
			'<span class="has-tooltip username" title="{{shareWith}}">{{shareWithDisplayName}}</span>' +
			'{{#if shareWithAdditionalInfo}}' +
			'<span class="has-tooltip user-additional-info">({{shareWithAdditionalInfo}})</span>' +
			'{{/if}}' +
			'{{#if mailNotificationEnabled}}  {{#unless isRemoteShare}}' +
			'<span class="shareOption">' +
			'{{#unless wasMailSent}}' +
			'<span class="mailNotificationSpinner icon-loading-small hidden"></span>' +
			'<input id="mail-{{cid}}-{{shareWith}}" type="button" name="mailNotification" value="{{notifyByMailLabel}}" class="mailNotification checkbox" />' +
			'{{/unless}}' +
			'</span>' +
			'{{/unless}} {{/if}}' +
			'<div class="cruds">' +
			'<span class="shareOption">' +
			'<input id="canRead-{{cid}}-{{shareWith}}" type="checkbox" name="read" class="permissions checkbox" checked="checked" disabled/>' +
			'<label for="canRead-{{cid}}-{{shareWith}}">can view</label>' +
			'</span>' +
			'{{#if createPermissionPossible}}' +
			'<span class="shareOption">' +
			'<input id="canCreate-{{cid}}-{{shareWith}}" type="checkbox" name="create" class="permissions checkbox" {{#if hasCreatePermission}}checked="checked"{{/if}} data-permissions="31"/>' +
			'<label for="canCreate-{{cid}}-{{shareWith}}">can modify</label>' +
			'</span>' +
			'{{/if}}' +
			'<span class="shareOption">' +
				'<button class="cbox-mail-notification">Send mail</button>' +
			'</span>' +
			'</div>' +
			'</li>' +
			'<span>Direct link (only work for recipients of the share):</br><a href="https://cernbox.cern.ch/index.php/apps/files/?dir=/__myshares/ (id:{{shareId}})">https://cernbox.cern.ch/index.php/apps/files/?dir=/__myshares/ (id:{{shareId}})</a></span>' +
			'{{/each}}' +
			'</ul>'
		;

	/**
	 * @class OCA.Share.ShareDialogShareeListView
	 * @member {OC.Share.ShareItemModel} model
	 * @member {jQuery} $el
	 * @memberof OCA.Sharing
	 * @classdesc
	 *
	 * Represents the sharee list part in the GUI of the share dialogue
	 *
	 */
	var ShareDialogShareeListView = OC.Backbone.View.extend({
		/** @type {string} **/
		id: 'shareDialogLinkShare',

		/** @type {OC.Share.ShareConfigModel} **/
		configModel: undefined,

		/** @type {Function} **/
		_template: undefined,

		events: {
			'click .unshare': 'onUnshare',
			'click .permissions': 'onPermissionChange',
			'click .showCruds': 'onCrudsToggle',
			'click .mailNotification': 'onSendMailNotification',
			'click .cbox-mail-notification': 'onSendCboxMailNotification'
		},

		initialize: function(options) {
			if(!_.isUndefined(options.configModel)) {
				this.configModel = options.configModel;
			} else {
				throw 'missing OC.Share.ShareConfigModel';
			}

			var view = this;
			this.model.on('change:shares', function() {
				view.render();
			});
		},

		/**
		 *
		 * @param {OC.Share.Types.ShareInfo} shareInfo
		 * @returns {object}
		 */
		getShareeObject: function(shareIndex) {
			var shareWith = this.model.getShareWith(shareIndex);
			var shareWithDisplayName = this.model.getShareWithDisplayName(shareIndex);
			var shareType = this.model.getShareType(shareIndex);
			var shareWithAdditionalInfo = this.model.getShareWithAdditionalInfo(shareIndex);

			var hasPermissionOverride = {};
			if (shareType === OC.Share.SHARE_TYPE_GROUP) {
				shareWithDisplayName = shareWithDisplayName + " (" + t('core', 'group') + ')';
			} else if (shareType === OC.Share.SHARE_TYPE_REMOTE) {
				shareWithDisplayName = shareWithDisplayName + " (" + t('core', 'federated') + ')';
			}

			return _.extend(hasPermissionOverride, {
				cid: this.cid,
				hasSharePermission: this.model.hasSharePermission(shareIndex),
				hasEditPermission: this.model.hasEditPermission(shareIndex),
				hasCreatePermission: this.model.hasCreatePermission(shareIndex),
				hasUpdatePermission: this.model.hasUpdatePermission(shareIndex),
				hasDeletePermission: this.model.hasDeletePermission(shareIndex),
				wasMailSent: this.model.notificationMailWasSent(shareIndex),
				shareWith: shareWith,
				shareWithDisplayName: shareWithDisplayName,
				shareWithAdditionalInfo: shareWithAdditionalInfo,
				shareType: shareType,
				shareId: this.model.get('shares')[shareIndex].id,
				modSeed: shareType !== OC.Share.SHARE_TYPE_USER,
				isRemoteShare: shareType === OC.Share.SHARE_TYPE_REMOTE
			});
		},

		getShareeList: function() {
			var universal = {
				avatarEnabled: this.configModel.areAvatarsEnabled(),
				mailNotificationEnabled: this.configModel.isMailNotificationEnabled(),
				notifyByMailLabel: t('core', 'notify by email'),
				unshareLabel: t('core', 'Unshare'),
				canShareLabel: t('core', 'can share'),
				canEditLabel: t('core', 'can edit'),
				createPermissionLabel: t('core', 'create'),
				updatePermissionLabel: t('core', 'change'),
				deletePermissionLabel: t('core', 'delete'),
				crudsLabel: t('core', 'access control'),
				triangleSImage: OC.imagePath('core', 'actions/triangle-s'),
				isResharingAllowed: this.configModel.get('isResharingAllowed'),
				sharePermissionPossible: this.model.sharePermissionPossible(),
				editPermissionPossible: this.model.editPermissionPossible(),
				createPermissionPossible: this.model.createPermissionPossible(),
				updatePermissionPossible: this.model.updatePermissionPossible(),
				deletePermissionPossible: this.model.deletePermissionPossible(),
				sharePermission: OC.PERMISSION_SHARE,
				createPermission: OC.PERMISSION_CREATE,
				updatePermission: OC.PERMISSION_UPDATE,
				deletePermission: OC.PERMISSION_DELETE,
				mailerAppEnabled: true
			};

			if(!this.model.hasUserShares()) {
				return [];
			}

			var shares = this.model.get('shares');
			var list = [];
			for(var index = 0; index < shares.length; index++) {
				// first empty {} is necessary, otherwise we get in trouble
				// with references
				list.push(_.extend({}, universal, this.getShareeObject(index)));
			}

			return list;
		},

		render: function() {
			this.$el.html(this.template({
				cid: this.cid,
				sharees: this.getShareeList()
			}));

			if(this.configModel.areAvatarsEnabled()) {
				this.$el.find('.avatar').each(function() {
					var $this = $(this);
					if ($this.hasClass('imageplaceholderseed')) {
						$this.css({width: 32, height: 32});
						$this.imageplaceholder($this.data('seed'));
					} else {
						$this.avatar($this.data('username'), 32);
					}
				});
			}

			this.$el.find('.has-tooltip').tooltip({
				placement: 'bottom'
			});

			this.delegateEvents();

			return this;
		},

		/**
		 * @returns {Function} from Handlebars
		 * @private
		 */
		template: function (data) {
			if (!this._template) {
				this._template = Handlebars.compile(TEMPLATE);
			}
			return this._template(data);
		},

		onUnshare: function(event) {
			var self = this;
			var $element = $(event.target);
			if (!$element.is('a')) {
				$element = $element.closest('a');
			}

			var $loading = $element.find('.icon-loading-small').eq(0);
			if(!$loading.hasClass('hidden')) {
				// in process
				return false;
			}
			$loading.removeClass('hidden');

			var $li = $element.closest('li');

			var shareId = $li.data('share-id');

			self.model.removeShare(shareId)
				.done(function() {
					$li.remove();
				})
				.fail(function() {
					$loading.addClass('hidden');
					OC.Notification.showTemporary(t('core', 'Could not unshare'));
				});
			return false;
		},

		onPermissionChange: function(event) {
			var $element = $(event.target);
			var $li = $element.closest('li');
			var shareId = $li.data('share-id');
			var shareType = $li.data('share-type');
			var shareWith = $li.attr('data-share-with');

			// adjust checkbox states
			var $checkboxes = $('.permissions', $li).not('input[name="edit"]').not('input[name="share"]');
			var checked;
			if ($element.attr('name') === 'edit') {
				checked = $element.is(':checked');
				// Check/uncheck Create, Update, and Delete checkboxes if Edit is checked/unck
				$($checkboxes).prop('checked', checked);
			} else {
				var numberChecked = $checkboxes.filter(':checked').length;
				checked = numberChecked > 0;
				$('input[name="edit"]', $li).prop('checked', checked);
			}

			var permissions = OC.PERMISSION_READ;
			$('.permissions', $li).not('input[name="edit"]').filter(':checked').each(function(index, checkbox) {
				permissions |= $(checkbox).data('permissions');
			});

			this.model.updateShare(shareId, {permissions: permissions});
		},

		onCrudsToggle: function(event) {
			var $target = $(event.target);
			$target.closest('li').find('.cruds').toggleClass('hidden');
			return false;
		},

		onSendMailNotification: function(event) {
			var $target = $(event.target);
			var $li = $(event.target).closest('li');
			var shareType = $li.data('share-type');
			var shareWith = $li.attr('data-share-with');

			var $loading = $target.prev('.icon-loading-small');

			$target.addClass('hidden');
			$loading.removeClass('hidden');

			this.model.sendNotificationForShare(shareType, shareWith, true).then(function(result) {
				if (result.status === 'success') {
					OC.Notification.showTemporary(t('core', 'Email notification was sent!'));
					$target.remove();
				} else {
					// sending was successful but some users might not have any email address
					OC.dialogs.alert(t('core', result.data.message), t('core', 'Email notification not sent'));
				}

				$target.removeClass('hidden');
				$loading.addClass('hidden');
			});
		},

		onSendCboxMailNotification: function(event) {
			var $target = $(event.target);
			var $li = $(event.target).closest('li');
			var shareType = $li.data('share-type');
			var shareWith = $li.attr('data-share-with');
			var shareID = $li.attr('data-share-id');

			var url = OC.generateUrl('/apps/mailer/sendmail');
			var data = {
				'recipient': shareWith,
				'shareType': shareType,
				'id': shareID,
			};

			var path = this.model.get('path'); 
			$.post(url, data)
				.success(function (result) {
					OC.dialogs.info(t('core', result.message === '' ? 'Mail sent' : result.message), t('core', 'Mail sharing notifications'));
				})
				.fail(function(result) {
					OC.dialogs.alert(t('core', result.message), t('core', 'Warning'));
				});
		}

	});

	OC.Share.ShareDialogShareeListView = ShareDialogShareeListView;

})();
