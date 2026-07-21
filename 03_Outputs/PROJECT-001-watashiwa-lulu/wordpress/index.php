<?php
/**
 * わたしはルル テーマ index.php
 * WordPressテーマとして必須の最終フォールバック（他のテンプレートが該当しない場合に使用）。
 */
get_header();
?>

<section class="section">
  <div class="container">
    <div class="post-list">
      <?php if ( have_posts() ) : ?>
        <?php while ( have_posts() ) : the_post(); ?>
          <article class="post-card">
            <div class="thumb" aria-hidden="true">
              <?php if ( has_post_thumbnail() ) : ?>
                <?php the_post_thumbnail( 'medium' ); ?>
              <?php endif; ?>
            </div>
            <div>
              <p class="post-meta">
                <span class="cat"><?php echo esc_html( lulu_first_category_name() ); ?></span>
                <?php echo esc_html( get_the_date() ); ?>
              </p>
              <h3><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h3>
              <p><?php echo esc_html( wp_trim_words( get_the_excerpt(), 40 ) ); ?></p>
            </div>
          </article>
        <?php endwhile; ?>
      <?php else : ?>
        <p>コンテンツがありません。</p>
      <?php endif; ?>
    </div>

    <nav class="pagination" aria-label="ページ送り">
      <?php the_posts_pagination(); ?>
    </nav>
  </div>
</section>

<?php get_footer(); ?>
