<?php
/**
 * Template Name: よくある質問
 * サイトマップ「3.よくある質問」用の固定ページテンプレート。
 * Q&A一覧はテンプレート側で管理。文言を変える場合はこのファイルを編集する。
 */
get_header();
?>

<section class="hero" style="padding-bottom:0;">
  <div class="container">
    <p class="tagline">FAQ</p>
    <h1><?php the_title(); ?></h1>
    <div class="lead">
      <?php if ( have_posts() ) : while ( have_posts() ) : the_post(); the_content(); endwhile; endif; ?>
    </div>
  </div>
</section>

<section class="section">
  <div class="container">

    <details class="faq-item" open>
      <summary><span class="q-label">Q1.</span>「わたしはルル」はどんなサービス？</summary>
      <div class="a">主に65歳以上や一人暮らしの方で猫と暮らしたい方を、飼い主のいない大人の猫（成猫）さんに引き合わせ、一緒にお世話していくサービスです。</div>
    </details>

    <details class="faq-item">
      <summary><span class="q-label">Q2.</span>なぜ65歳以上の方や一人暮らしの方だけなの？</summary>
      <div class="a">・おとなの猫さんは、里親が見つかりづらいためです。
・おとなの猫さんは動きもゆっくりなので、穏やかに過ごせます。
・子猫さんは動きがすばしっこく体調も崩しやすいので、飼うのが大変です（好奇心旺盛のため脱走しやすい）。
・子猫の時にしか使わないもの（おもちゃ等）を買わなくてよい、というメリットもあります。</div>
    </details>

    <details class="faq-item">
      <summary><span class="q-label">Q3.</span>子猫から迎えないと、なれてくれないのでは？</summary>
      <div class="a">そんなことはありません。たくさんの愛情を持って接すれば、どんな子とも仲良くなれます（ベタベタに甘えるだけが愛情ではありません）。</div>
    </details>

    <details class="faq-item">
      <summary><span class="q-label">Q4.</span>新たに迎え入れる猫を自分で（ペットショップ等で）探し、その猫でサービスを受けていいの？</summary>
      <div class="a">当サービスでご紹介する保護猫に限らせていただきます。</div>
    </details>

    <details class="faq-item">
      <summary><span class="q-label">Q5.</span>新たに猫を迎え入れないとサービスを受けられないの？</summary>
      <div class="a">いいえ。今、猫を飼われていて、その猫さんのお世話を一緒にしてほしいという方も大歓迎です。</div>
    </details>

    <details class="faq-item">
      <summary><span class="q-label">Q6.</span>飼えなくなって手放さなくてはいけなくなった猫の引き取りはしていますか？</summary>
      <div class="a">100%ではありませんが、引き取れることもあります。ぜひ、ご相談ください。</div>
    </details>

    <details class="faq-item">
      <summary><span class="q-label">Q7.</span>サポートをやめることはできますか？</summary>
      <div class="a">可能です。また再開も可能です（ある程度の期間は、続けていただけたらと思います。お客様と猫さんのことが心配なので……）。</div>
    </details>

  </div>
</section>

<section class="section">
  <div class="container" style="text-align:center;">
    <h2>解決しないご質問がありましたら</h2>
    <a class="btn" href="<?php echo esc_url( home_url( '/contact/' ) ); ?>">お問合せフォームへ</a>
  </div>
</section>

<?php get_footer(); ?>
