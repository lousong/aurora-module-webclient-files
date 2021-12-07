'use strict';

var
	ko = require('knockout'),
	
	TextUtils = require('%PathToCoreWebclientModule%/js/utils/Text.js'),
	Types = require('%PathToCoreWebclientModule%/js/utils/Types.js'),

	App = require('%PathToCoreWebclientModule%/js/App.js'),
	CAbstractFileModel = require('%PathToCoreWebclientModule%/js/models/CAbstractFileModel.js')
;

/**
 * @constructor
 * @param {object} oParent
 */
function CFolderModel(oParent)
{
	this.oParent = oParent;
	
	//template
	this.selected = ko.observable(false);
	this.checked = ko.observable(false); // ? = selected ?
	this.deleted = ko.observable(false); // temporary removal until it was confirmation from the server to delete, css-animation
	this.recivedAnim = ko.observable(false).extend({'autoResetToFalse': 500});
	
	this.published = ko.observable(false);
	this.sharedWithOthers = ko.observable(false); // can be changed by other modules
	this.fileName = ko.observable('');
	
	//onDrop
	this.fullPath = ko.observable('');
	
	//rename
	this.path = ko.observable('');
	
	//pathItems
	this.storageType = ko.observable(Enums.FileStorageType.Personal);
	this.id = ko.observable('');
	
	this.sMainAction = 'list';
	this.oExtendedProps = null;

	this.sOwnerName = '';
	this.bSharedWithMeAccessReshare = false;
	this.bSharedWithMeAccessWrite = false;
	this.bSharedWithMe = false;
	this.bSharedWithMeFirstLevel = false;
	
	// The folder can be uploading. Operations should be disabled for such a folder.
	this.uploadingFilesCount = ko.observable(0);
	this.uploadedFilesCount = ko.observable(0);
	this.progressPercent = ko.computed(function () {
		if (this.uploadingFilesCount() > 0)
		{
			return Math.floor((this.uploadedFilesCount() / this.uploadingFilesCount()) * 100);
		}
		return 0;
	}, this);
	this.isIncomplete = ko.computed(function () {
		return this.uploadingFilesCount() > 0;
	}, this);
	this.uploaded = ko.computed(function () {
		return this.uploadingFilesCount() === 0;
	}, this);
	
	this.allowDrag = ko.computed(function () {
		return !oParent.bInPopup && !this.isIncomplete();
	}, this);
}

CFolderModel.prototype.parseSharedWithMeAccess = function ()
{
	this.bSharedWithMeAccessReshare = this.oExtendedProps.SharedWithMeAccess === Enums.SharedFileAccess.Reshare;
	this.bSharedWithMeAccessWrite = this.bSharedWithMeAccessReshare || this.oExtendedProps.SharedWithMeAccess === Enums.SharedFileAccess.Write;
	this.bSharedWithMe = this.bSharedWithMeAccessWrite || this.oExtendedProps.SharedWithMeAccess === Enums.SharedFileAccess.Read;
};

CFolderModel.prototype.parse = function (oData)
{
	this.published(!!oData.Published);
	this.fileName(Types.pString(oData.Name));
	this.fullPath(Types.pString(oData.FullPath));
	this.path(Types.pString(oData.Path));
	this.storageType(Types.pString(oData.Type));
	this.id(Types.pString(oData.Id));
	this.oExtendedProps = Types.pObject(oData.ExtendedProps);
	if (oData.MainAction)
	{
		this.sMainAction = Types.pString(oData.MainAction);
	}

	this.sOwnerName = Types.pString(oData.Owner);
	this.parseSharedWithMeAccess();
	this.bSharedWithMeFirstLevel = Types.pBool(oData.Shared);
	
	this.displayName = ko.computed(function () {
		if (this.storageType() === Enums.FileStorageType.Shared && this.bSharedWithMeFirstLevel) {
			return this.fullPath().replace(/^\//, '');
		}
		return this.fileName();
	}, this);

	this.allowDrop = ko.computed(function () {
		return	!this.oParent.bInPopup && !this.isIncomplete() && this.storageType() !== Enums.FileStorageType.Shared
				&& (!this.bSharedWithMe || this.bSharedWithMeAccessWrite && (!this.oParent.selectedHasShared() || this.oParent.needToCopyDraggedItems()));
	}, this);
	
	this.sHeaderDenseText = this.bSharedWithMe ? TextUtils.i18n('%MODULENAME%/INFO_SHARED') : '';
	this.sHeaderText = function () {
		if (this.bSharedWithMe && this.sOwnerName) {
			return TextUtils.i18n('%MODULENAME%/INFO_SHARED_BY', {
				'OWNER': this.sOwnerName
			});
		}
		return '';
	}.bind(this)();
	
	App.broadcastEvent('%ModuleName%::ParseFolder::after', [this, oData]);
};

CFolderModel.prototype.getMainAction = function ()
{
	return this.sMainAction;
};

CFolderModel.prototype.increaseUploadingFiles = function ()
{
	return this.uploadingFilesCount(this.uploadingFilesCount() + 1);
};

CFolderModel.prototype.increaseUploadedFiles = function ()
{
	return this.uploadedFilesCount(this.uploadedFilesCount() + 1);
};


CFolderModel.prototype.eventDragStart = CAbstractFileModel.prototype.eventDragStart;

module.exports = CFolderModel;
