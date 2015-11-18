<?php
/**
 * @author Arthur Schiwon <blizzz@owncloud.com>
 * @author Lukas Reschke <lukas@owncloud.com>
 * @author Morris Jobke <hey@morrisjobke.de>
 * @author Robin Appelman <icewind@owncloud.com>
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

// Check user and app status
OCP\JSON::checkAdminUser();
OCP\JSON::checkAppEnabled('user_ldap');
OCP\JSON::callCheck();

$l = \OC::$server->getL10N('user_ldap');

if(!isset($_POST['action'])) {
	\OCP\JSON::error(array('message' => $l->t('No action specified')));
}
$action = (string)$_POST['action'];


if(!isset($_POST['ldap_serverconfig_chooser'])) {
	\OCP\JSON::error(array('message' => $l->t('No configuration specified')));
}
$prefix = (string)$_POST['ldap_serverconfig_chooser'];

$ldapWrapper = new \OCA\user_ldap\lib\LDAP();
$configuration = new \OCA\user_ldap\lib\Configuration($prefix);

$con = new \OCA\user_ldap\lib\Connection($ldapWrapper, '', null);
$con->setConfiguration($configuration->getConfiguration());
$con->ldapConfigurationActive = true;
$con->setIgnoreValidation(true);

$userManager = new \OCA\user_ldap\lib\user\Manager(
	\OC::$server->getConfig(),
	new \OCA\user_ldap\lib\FilesystemHelper(),
	new \OCA\user_ldap\lib\LogWrapper(),
	\OC::$server->getAvatarManager(),
	new \OCP\Image(),
	\OC::$server->getDatabaseConnection());

$access = new \OCA\user_ldap\lib\Access($con, $ldapWrapper, $userManager);

$wizard = new \OCA\user_ldap\lib\Wizard($configuration, $ldapWrapper, $access);

switch($action) {
	case 'guessPortAndTLS':
	case 'guessBaseDN':
	case 'detectEmailAttribute':
	case 'detectUserDisplayNameAttribute':
	case 'determineGroupMemberAssoc':
	case 'determineUserObjectClasses':
	case 'determineGroupObjectClasses':
	case 'determineGroupsForUsers':
	case 'determineGroupsForGroups':
	case 'determineAttributes':
	case 'getUserListFilter':
	case 'getUserLoginFilter':
	case 'getGroupFilter':
	case 'countUsers':
	case 'countGroups':
	case 'countInBaseDN':
		try {
			$result = $wizard->$action();
			if($result !== false) {
				OCP\JSON::success($result->getResultArray());
				exit;
			}
		} catch (\Exception $e) {
			\OCP\JSON::error(array('message' => $e->getMessage(), 'code' => $e->getCode()));
			exit;
		}
		\OCP\JSON::error();
		exit;
		break;
			
	case 'testLoginName': {
		try {
			$loginName = $_POST['ldap_test_loginname'];
			$result = $wizard->$action($loginName);
			if($result !== false) {
				OCP\JSON::success($result->getResultArray());
				exit;
			}
		} catch (\Exception $e) {
			\OCP\JSON::error(array('message' => $e->getMessage(), 'code' => $e->getCode()));
			exit;
		}
		\OCP\JSON::error();
		exit;
		break;
	}
	
	case 'save':
		$key = isset($_POST['cfgkey']) ? $_POST['cfgkey'] : false;
		$val = isset($_POST['cfgval']) ? $_POST['cfgval'] : null;
		if($key === false || is_null($val)) {
			\OCP\JSON::error(array('message' => $l->t('No data specified')));
			exit;
		}
		$cfg = array($key => $val);
		$setParameters = array();
		$configuration->setConfiguration($cfg, $setParameters);
		if(!in_array($key, $setParameters)) {
			\OCP\JSON::error(array('message' => $l->t($key.
				' Could not set configuration %s', $setParameters[0])));
			exit;
		}
		$configuration->saveConfiguration();
		//clear the cache on save
		$connection = new \OCA\user_ldap\lib\Connection($ldapWrapper, $prefix);
		$connection->clearCache();
		OCP\JSON::success();
		break;
	default:
		\OCP\JSON::error(array('message' => $l->t('Action does not exist')));
		break;
}
