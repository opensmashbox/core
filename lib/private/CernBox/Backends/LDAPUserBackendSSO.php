<?php
/**
 * Created by PhpStorm.
 * User: labkode
 * Date: 8/18/17
 * Time: 10:50 AM
 */

namespace OC\CernBox\Backends;


use OCP\Authentication\IApacheBackend;

class LDAPUserBackendSSO extends LDAPUserBackend implements IApacheBackend {

	public function isSessionActive() {
		if(isset($_SERVER['ADFS_LOGIN'])) {
			return true;
		} else {
			return false;
		}
	}

	public function getLogoutAttribute() { 
		$ref = \OCP\Util::linkToAbsolute("index.php/apps/cernboxauthtoken", "logout");
		return 'href="'.$ref.'"';
	 }

	public function getCurrentUserId() {
		if(isset($_SERVER['ADFS_LOGIN']) && is_string($_SERVER["ADFS_LOGIN"])) {
			return $_SERVER['ADFS_LOGIN'];
		}
		return null;
	}

}
