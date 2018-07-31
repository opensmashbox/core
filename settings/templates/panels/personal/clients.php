<div id="clientsbox" class="section clientsbox">
	<h2 class="app-name"><?php p($l->t('Get the apps to sync your files'));?></h2>
	<a href="<?php p($_['clients']['desktop']); ?>" rel="noreferrer" target="_blank">
		<img src="<?php print_unescaped(image_path('core', 'desktopapp.svg')); ?>"
		alt="<?php p($l->t('Desktop client'));?>" />
	</a>
	<a href="<?php p($_['clients']['android']); ?>" rel="noreferrer" target="_blank">
		<img src="<?php print_unescaped(image_path('core', 'googleplay.png')); ?>"
		alt="<?php p($l->t('Android app'));?>" />
	</a>
	<a href="<?php p($_['clients']['ios']); ?>" rel="noreferrer" target="_blank">
		<img src="<?php print_unescaped(image_path('core', 'appstore.svg')); ?>"
		alt="<?php p($l->t('iOS app'));?>" />
	</a>
	<?php if (OC_APP::isEnabled('firstrunwizard')) {
	?>
		<p><a class="button" href="#" id="showWizard"><?php p($l->t('Show First Run Wizard again')); ?></a></p>
	<?php
}?>
</div>
