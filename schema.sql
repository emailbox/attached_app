
SET SQL_MODE="NO_AUTO_VALUE_ON_ZERO";

CREATE TABLE IF NOT EXISTS `f_collections` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `key` varchar(255) CHARACTER SET latin1 NOT NULL,
  `created` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `url` (`key`),
  KEY `user_id` (`user_id`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8 AUTO_INCREMENT=49 ;

CREATE TABLE IF NOT EXISTS `f_users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `emailbox_id` varchar(255) CHARACTER SET latin1 NOT NULL,
  `access_token` varchar(255) CHARACTER SET latin1 NOT NULL,
  `created` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `emailbox_id` (`emailbox_id`),
  KEY `user_token` (`access_token`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8 AUTO_INCREMENT=558 ;
