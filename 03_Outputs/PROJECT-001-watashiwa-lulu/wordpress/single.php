<?php
/**
 * わたしはルル テーマ single.php
 * サイトマップ「6.お知らせ/ブログの記事内容」用（個別記事）。
 */
get_header();
?>

<?php while ( have_posts() ) : the_post(); ?>

  <section class="section" style="padding-bottom:0;">
    <div class="container post-single" style="max-width:720px;">
      <p class="post-meta">
        <span class="cat"><?php echo esc_html( lulu_first_category_name() ); ?></span>
        <?php echo esc_html( get_the_date() ); ?>
      </p>
      <h1 class="post-title"><?php the_title(); ?></h1>
    </div>
  </section>

  <section class="section">
    <div class="container post-single" style="max-width:720px;">
      <?php if ( has_post_thumbnail() ) : ?>
        <div class="post-thumb"><?php the_post_thumbnail( 'large' ); ?></div>
      <?php else : ?>
        <div class="post-thumb" aria-hidden="true"></div>
      <?php endif; ?>

      <div class="post-body">
        <?php the_content(); ?>
      </div>

      <p style="text-align:center;margin-top:32px;">
        <a class="btn" href="<?php echo esc_url( home_url( '/contact/' ) ); ?>">相談してみる</a>
      </p>

      <p style="text-align:center;margin-top:20px;">
        <a href="<?php echo esc_url( home_url( '/blog/' ) ); ?>">＜ お知らせ・ブログ一覧に戻る</a>
      </p>
    </div>
  </section>

<?php endwhile; ?>

<?php get_footer(); ?>
