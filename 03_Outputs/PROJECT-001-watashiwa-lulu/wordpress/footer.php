</main>

<footer class="site-footer">
  <div class="container">
    <div>
      <img src="<?php echo esc_url( get_template_directory_uri() . '/images/logo.svg' ); ?>" alt="<?php bloginfo( 'name' ); ?>" style="height:48px;margin-bottom:12px;">
      <p>保護猫と、あたたかな暮らしを。<br>訪問サポート型の猫飼育支援サービスです。</p>
    </div>
    <nav class="foot-nav" aria-label="フッターナビゲーション">
      <?php
      wp_nav_menu(
        array(
          'theme_location' => 'footer',
          'container'      => false,
          'items_wrap'     => '<ul>%3$s</ul>',
          'fallback_cb'    => 'lulu_fallback_menu',
        )
      );
      ?>
    </nav>
    <div class="copyright">&copy; <?php echo esc_html( date_i18n( 'Y' ) ); ?> <?php bloginfo( 'name' ); ?></div>
  </div>
</footer>

<?php wp_footer(); ?>
</body>
</html>
