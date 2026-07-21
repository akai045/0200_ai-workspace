<?php
/**
 * わたしはルル テーマ page.php
 * 専用テンプレートを割り当てていない固定ページ用のフォールバック。
 */
get_header();
?>

<section class="section">
  <div class="container" style="max-width:720px;">
    <?php
    while ( have_posts() ) :
      the_post();
      ?>
      <h1><?php the_title(); ?></h1>
      <div class="post-body" style="background:none;border:none;padding:0;">
        <?php the_content(); ?>
      </div>
      <?php
    endwhile;
    ?>
  </div>
</section>

<?php get_footer(); ?>
