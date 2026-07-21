<?php
/**
 * わたしはルル テーマ header.php
 */
?><!doctype html>
<html <?php language_attributes(); ?>>
<head>
<meta charset="<?php bloginfo( 'charset' ); ?>">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="icon" href="<?php echo esc_url( get_template_directory_uri() . '/images/logo.svg' ); ?>" type="image/svg+xml">
<?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>
<a class="skip-link" href="#main">本文へ</a>

<header class="site-header">
  <div class="container">
    <a class="site-logo" href="<?php echo esc_url( home_url( '/' ) ); ?>">
      <?php if ( has_custom_logo() ) : ?>
        <?php the_custom_logo(); ?>
      <?php else : ?>
        <img src="<?php echo esc_url( get_template_directory_uri() . '/images/logo-horizontal.svg' ); ?>" alt="<?php bloginfo( 'name' ); ?>">
      <?php endif; ?>
    </a>
    <button class="nav-toggle" aria-controls="site-nav" aria-expanded="false" aria-label="メニューを開閉する">
      <span class="bar"></span><span class="bar"></span><span class="bar"></span>
    </button>
    <nav class="site-nav" id="site-nav" aria-label="メインナビゲーション">
      <?php
      wp_nav_menu(
        array(
          'theme_location' => 'primary',
          'container'      => false,
          'items_wrap'     => '<ul>%3$s</ul>',
          'fallback_cb'    => 'lulu_fallback_menu',
        )
      );
      ?>
    </nav>
  </div>
  <div class="nav-backdrop"></div>
</header>

<main id="main">
