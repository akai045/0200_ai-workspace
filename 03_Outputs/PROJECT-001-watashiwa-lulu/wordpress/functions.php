<?php
/**
 * わたしはルル テーマ functions.php
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

function lulu_setup() {
	add_theme_support( 'title-tag' );
	add_theme_support( 'post-thumbnails' );
	add_theme_support( 'html5', array( 'search-form', 'comment-form', 'comment-list', 'gallery', 'caption' ) );
	add_theme_support(
		'custom-logo',
		array(
			'height'      => 56,
			'width'       => 200,
			'flex-height' => true,
			'flex-width'  => true,
		)
	);

	register_nav_menus(
		array(
			'primary' => 'メインナビゲーション',
			'footer'  => 'フッターナビゲーション',
		)
	);
}
add_action( 'after_setup_theme', 'lulu_setup' );

function lulu_enqueue_assets() {
	wp_enqueue_style(
		'lulu-google-fonts',
		'https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@400;700&family=Noto+Sans+JP:wght@400;500;700&display=swap',
		array(),
		null
	);
	wp_enqueue_style( 'lulu-style', get_stylesheet_uri(), array(), wp_get_theme()->get( 'Version' ) );
	wp_enqueue_script(
		'lulu-nav',
		get_template_directory_uri() . '/js/nav.js',
		array(),
		wp_get_theme()->get( 'Version' ),
		true
	);
}
add_action( 'wp_enqueue_scripts', 'lulu_enqueue_assets' );

/**
 * メインナビゲーションが未設定のときに表示する既定のリンク。
 * サイト運用者が「外観 > メニュー」で primary の位置にメニューを割り当てると、こちらは表示されなくなる。
 */
function lulu_fallback_menu() {
	$links = array(
		home_url( '/' )          => 'トップ',
		home_url( '/service/' )  => 'サービス内容',
		home_url( '/faq/' )      => 'よくある質問',
		home_url( '/blog/' )     => 'お知らせ・ブログ',
		home_url( '/contact/' )  => 'お問合せ',
	);
	echo '<ul>';
	foreach ( $links as $url => $label ) {
		printf( '<li><a href="%s">%s</a></li>', esc_url( $url ), esc_html( $label ) );
	}
	echo '</ul>';
}

/**
 * 一覧に表示するお知らせ・ブログのカテゴリラベル（先頭の1件）。
 */
function lulu_first_category_name() {
	$cats = get_the_category();
	return ! empty( $cats ) ? $cats[0]->name : 'お知らせ';
}
