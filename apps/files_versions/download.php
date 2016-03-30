<?php
/**
 * @author Andreas Fischer <bantu@owncloud.com>
 * @author Björn Schießle <schiessle@owncloud.com>
 * @author Lukas Reschke <lukas@owncloud.com>
 * @author Morris Jobke <hey@morrisjobke.de>
 * @author Vincent Petry <pvince81@owncloud.com>
 *
 * @copyright Copyright (c) 2015, ownCloud, Inc.
 * @license AGPL-3.0
 *
 * This code is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License, version 3,
 * as published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License, version 3,
 * along with this program.  If not, see <http://www.gnu.org/licenses/>
 *
 */

OCP\JSON::checkAppEnabled('files_versions');
OCP\JSON::checkLoggedIn();

$file = $_GET['file'];
$revision=(int)$_GET['revision'];

list($uid, $filename) = OCA\Files_Versions\Storage::getUidAndFilename($file);

/** CERNBOX VERSION APP PLUGIN PATCH */
$pathinfo = pathinfo($filename);
$versionName = '/'. $uid .'/files/' .$pathinfo['dirname'] . '/.sys.v#.'.$pathinfo['basename'].'/'. $revision;

$view = new OC\Files\View('/');

$ftype = \OC_Helper::getSecureMimeType($view->getMimeType('/'.$uid.'/files/'.$filename));

header('Content-Type:'.$ftype);
OCP\Response::setContentDispositionHeader(basename($filename), 'attachment');
OCP\Response::disableCaching();
OCP\Response::setContentLengthHeader($view->filesize($versionName));

OC_Util::obEnd();

$view->readfile($versionName);
