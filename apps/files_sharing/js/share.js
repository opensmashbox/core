/*
 * Copyright (c) 2014
 *
 * This file is licensed under the Affero General Public License version 3
 * or later.
 *
 * See the COPYING-README file.
 *
 */

(function() {
	if (!OCA.Sharing) {
		OCA.Sharing = {};
	}
	/**
	 * @namespace
	 */
	OCA.Sharing.Util = {
			
		infoDropDownShown: false,
		
		/**
		 * Initialize the sharing plugin.
		 *
		 * Registers the "Share" file action and adds additional
		 * DOM attributes for the sharing file info.
		 *
		 * @param {OCA.Files.FileList} fileList file list to be extended
		 */
		attach : function(fileList) {
			// core sharing is disabled/not loaded
			if (!OC.Share) {
				return;
			}
			if (fileList.id === 'trashbin' || fileList.id === 'files.public') {
				return;
			}
			var fileActions = fileList.fileActions;
			var oldCreateRow = fileList._createRow;
			fileList._createRow = function(fileData) {
				var tr = oldCreateRow.apply(this, arguments);
				var sharePermissions = fileData.permissions;
				if (fileData.mountType
						&& fileData.mountType === "external-root") {
					// for external storages we cant use the permissions of the
					// mountpoint
					// instead we show all permissions and only use the share
					// permissions from the mountpoint to handle resharing
					sharePermissions = sharePermissions
							| (OC.PERMISSION_ALL & ~OC.PERMISSION_SHARE);
				}
				if (fileData.type === 'file') {
					// files can't be shared with delete permissions
					sharePermissions = sharePermissions & ~OC.PERMISSION_DELETE;
				}
				tr.attr('data-share-permissions', sharePermissions);
				if (fileData.shareOwner) {
					tr.attr('data-share-owner', fileData.ownerid);
					// user should always be able to rename a mount point
					if (fileData.isShareMountPoint) {
						tr.attr('data-permissions', fileData.permissions
								| OC.PERMISSION_UPDATE);
					}
				}
				if (fileData.recipientsDisplayName) {
					tr.attr('data-share-recipients',
							fileData.recipientsDisplayName);
				}
				return tr;
			};
			
			var oldElementToFile = fileList.elementToFile;
			fileList.elementToFile = function($el) {
				var fileInfo = oldElementToFile.apply(this, arguments);
				fileInfo.sharePermissions = $el.attr('data-share-permissions') || undefined;
				fileInfo.shareOwner = $el.attr('data-share-owner') || undefined;
				return fileInfo;
			};

			// use delegate to catch the case with multiple file lists
			fileList.$el.on('fileActionsReady', function(ev) {
				var fileList = ev.fileList;
				var $files = ev.$files;

				function updateIcons($files) {
					if (!$files) {
						// if none specified, update all
						$files = fileList.$fileList.find('tr');
					}
					_.each($files, function(file) {
						var $tr = $(file);
						var shareStatus = OC.Share.statuses[$tr.data('id')];
						OCA.Sharing.Util._updateFileActionIcon($tr, !!shareStatus, shareStatus && shareStatus.link);
					});
				}

				if (!OCA.Sharing.sharesLoaded) {
					OC.Share.loadIcons('file', fileList, function() {
						// since we don't know which files are affected, just
						// refresh them all
						updateIcons();
					});
					// assume that we got all shares, so switching directories
					// will not invalidate that list
					OCA.Sharing.sharesLoaded = true;
				} else {
					updateIcons($files);
				}
			});
			
			// XXX 8.0.0
			/*fileActions.register(
					'all',
					'Share',
					OC.PERMISSION_SHARE,
					OC.imagePath('core', 'actions/share'),
 					function(filename, context) {
						var $tr = context.$file;
						var itemType = 'file';
						if ($tr.data('type') === 'dir') {
							itemType = 'folder';
						}
						var possiblePermissions = $tr.data('share-permissions');
						if (_.isUndefined(possiblePermissions)) {
							possiblePermissions = $tr.data('permissions');
						}

						var appendTo = $tr.find('td.filename');
						// Check if drop down is already visible for a different file
						if (OC.Share.droppedDown) {
							if ($tr.attr('data-id') !== $('#dropdown').attr('data-item-source')) {
								OC.Share.hideDropDown(function() {
									$tr.addClass('mouseOver');
									OC.Share.showDropDown(itemType, $tr.data('id'), appendTo, true, possiblePermissions, filename);
								});
							} else {
								OC.Share.hideDropDown();
							}
						} else {
							$tr.addClass('mouseOver');
							OC.Share.showDropDown(itemType, $tr.data('id'), appendTo, true, possiblePermissions, filename);
						}
						
						$('#dropdown').on(
								'sharesChanged', function(ev) {
									// files app current cannot show recipients on load,
									// so we don't update the
									// icon when changed for consistency
									if (context.fileList.$el
											.closest('#app-content-files').length) {
										return;
									}
									var recipients = _.pluck(ev.shares[OC.Share.SHARE_TYPE_USER],'share_with_displayname');
									var groupRecipients = _.pluck(ev.shares[OC.Share.SHARE_TYPE_GROUP],'share_with_displayname');
									recipients = recipients.concat(groupRecipients);
									// note: we only update the data attribute because
									// updateIcon()
									// is called automatically after this event
									if (recipients.length) {
										$tr.attr('data-share-recipients',OCA.Sharing.Util.formatRecipients(recipients));
									} else {
										$tr.removeAttr('data-share-recipients');
									}
								});
					}, t('files_sharing', 'Share'));*/
			
			fileActions.registerAction({
				name: 'Share',
				displayName: '',
				mime: 'all',
				permissions: OC.PERMISSION_ALL,
				icon: OC.imagePath('core', 'actions/share'),
				type: OCA.Files.FileActions.TYPE_INLINE,
				actionHandler: function(fileName) {
					fileList.showDetailsView(fileName, 'shareTabView');
				},
				render: function(actionSpec, isDefault, context) {
					var permissions = parseInt(context.$file.attr('data-permissions'), 10);
					// if no share permissions but share owner exists, still show the link
					if ((permissions & OC.PERMISSION_SHARE) !== 0 || context.$file.attr('data-share-owner')) {
						return fileActions._defaultRenderAction.call(fileActions, actionSpec, isDefault, context);
					}
					// don't render anything
					return null;
				}
			});

			var shareTab = new OCA.Sharing.ShareTabView('shareTabView', {order: -20});
			// detect changes and change the matching list entry
			shareTab.on('sharesChanged', function(shareModel) {
				var fileInfoModel = shareModel.fileInfoModel;
				var $tr = fileList.findFileEl(fileInfoModel.get('name'));
				OCA.Sharing.Util._updateFileListDataAttributes(fileList, $tr, shareModel);
				if (!OCA.Sharing.Util._updateFileActionIcon($tr, shareModel.hasUserShares(), shareModel.hasLinkShare())) {
					// remove icon, if applicable
					OC.Share.markFileAsShared($tr, false, false);
				}
				var newIcon = $tr.attr('data-icon');
				// in case markFileAsShared decided to change the icon,
				// we need to modify the model
				// (FIXME: yes, this is hacky)
				if (fileInfoModel.get('icon') !== newIcon) {
					fileInfoModel.set('icon', newIcon);
				}
			});
			fileList.registerTabView(shareTab);
		},
		
		showInfoDropDown: function(fileId, eospath, projectname, appendTo) {
			OCA.Sharing.Util.infoDropDownShown = true;
			var html = '<div id="dropdown" class="drop shareDropDown" data-item-id="'+fileId+'">';
			html += '<p class="pathtext">EOS Path: ' + eospath + '</p>';
			if(projectname && projectname != 'undefined') {
				html += '<p class="pathtext">Project EGroups permissions</p>';
				html += '<p class="projecttext">cernbox-project-' + projectname + '-readers</p>';
				html += '<p class="projecttext">cernbox-project-' + projectname + '-writers</p>';
			}
			html += '</div>';
			
			var dropDownEl = $(html);
			dropDownEl = dropDownEl.appendTo(appendTo);
		},
		
		hideInfoDropDown: function(callback) {
			OCA.Sharing.Util.infoDropDownShown = false;
			$('#dropdown').hide('blind', function() {
				$('#dropdown').remove();
				
				if(callback) {
					callback.call();
				}
			});
		},
		
		/**
		 * Update file list data attributes
		 */
		_updateFileListDataAttributes: function(fileList, $tr, shareModel) {
			// files app current cannot show recipients on load, so we don't update the
			// icon when changed for consistency
			if (fileList.id === 'files') {
				return;
			}
			var recipients = _.pluck(shareModel.get('shares'), 'share_with_displayname');
			// note: we only update the data attribute because updateIcon()
			if (recipients.length) {
				$tr.attr('data-share-recipients', OCA.Sharing.Util.formatRecipients(recipients));
			}
			else {
				$tr.removeAttr('data-share-recipients');
			}
		},

		/**
		 * Update the file action share icon for the given file
		 *
		 * @param $tr file element of the file to update
		 */
		_updateFileActionIcon: function($tr, hasUserShares, hasLinkShare) {
			
			var shareStatus = OC.Share.statuses[$tr.data('id')];
			if (shareStatus || $tr.attr('data-share-recipients') || $tr.attr('data-share-owner')) {				
				$tr.find('.fileactions .action-share-info').remove();
				var shareInfo = '<a class="action action-share-info permanent"' +
						' data-action="Share-Information" href="#" original-title="">' +
						' <img class="svg" src="' + OC.imagePath('core', 'actions/info') + '"></img>';
				$tr.find('.fileactions').append(function() {
					var $result = $(shareInfo + '<span>Info</span>');
					$result.on('click', function() {
						
						if(OCA.Sharing.Util.infoDropDownShown) {
							var curFileId = $tr.attr('data-item-id');
							if($('#dropdown').data('item-id') != curFileId) {
								OCA.Sharing.Util.hideInfoDropDown(function () {
									OCA.Sharing.Util.showInfoDropDown(curFileId, $tr.attr('eospath'), $tr.attr('projectname'), $tr.find('td.filename'));
								});
							} else {
								OCA.Sharing.Util.hideInfoDropDown();
								OCA.Sharing.Util.infoDropDownShown = false;
							}
						} else {
							OCA.Sharing.Util.showInfoDropDown($tr.attr('data-item-id'), $tr.attr('eospath'), $tr.attr('projectname'), $tr.find('td.filename'));
							OCA.Sharing.Util.infoDropDownShown = true;
						}
							
						return false;
					});
					return $result;
				});
			}
			
			// if the statuses are loaded already, use them for the icon
			// (needed when scrolling to the next page)
			if (hasUserShares || hasLinkShare || $tr.attr('data-share-recipients') || $tr.attr('data-share-owner')) {
				OC.Share.markFileAsShared($tr, true, hasLinkShare);
				return true;
			}
			return false;
		},

		/**
		 * Formats a recipients array to be displayed.
		 * The first four recipients will be shown and the
		 * other ones will be shown as "+x" where "x" is the number of
		 * remaining recipients.
		 *
		 * @param {Array.<String>} recipients recipients array
		 * @param {int} count optional total recipients count (in case the array was shortened)
		 * @return {String} formatted recipients display text
		 */
		formatRecipients: function(recipients, count) {
			var maxRecipients = 4;
			var text;
			if (!_.isNumber(count)) {
				count = recipients.length;
			}
			// TODO: use natural sort
			recipients = _.first(recipients, maxRecipients).sort();
			text = recipients.join(', ');
			if (count > maxRecipients) {
				text += ', +' + (count - maxRecipients);
			}
			return text;
		}
	};
})();

OC.Plugins.register('OCA.Files.FileList', OCA.Sharing.Util);

