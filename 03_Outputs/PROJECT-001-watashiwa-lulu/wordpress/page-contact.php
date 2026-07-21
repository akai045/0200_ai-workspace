<?php
/**
 * Template Name: お問合せ
 * サイトマップ「4.お問合せフォーム」用の固定ページテンプレート。
 *
 * 注意：このテンプレートはフォームの見た目（HTML）のみを用意している。
 * 実際の送信処理（メール送信先の設定等）は本タスクの対象外（本番反映にあたるため）。
 * 導入時は Contact Form 7 / WPForms 等のプラグインでこの見た目のフォームを再現するか、
 * functions.php に wp_mail() を使った送信処理を human の承認のもとで追加する。
 */
get_header();
?>

<section class="hero" style="padding-bottom:0;">
  <div class="container">
    <p class="tagline">CONTACT</p>
    <h1><?php the_title(); ?></h1>
    <div class="lead">
      <?php if ( have_posts() ) : while ( have_posts() ) : the_post(); the_content(); endwhile; endif; ?>
    </div>
  </div>
</section>

<section class="section">
  <div class="container" style="max-width:640px;">

    <div class="form-note">
      入力いただいた情報は、ご相談・サービスご提供のご連絡のみに利用します。第三者への提供は行いません。
    </div>

    <form action="#" method="post">
      <div class="form-field">
        <label for="name">お名前<span class="required">必須</span></label>
        <input type="text" id="name" name="name" required>
      </div>

      <div class="form-field">
        <label for="age">年齢<span class="required">必須</span></label>
        <input type="number" id="age" name="age" min="0" required>
      </div>

      <div class="form-field">
        <label for="tel">お電話番号<span class="required">必須</span></label>
        <input type="tel" id="tel" name="tel" required>
      </div>

      <div class="form-field">
        <label for="email">メールアドレス</label>
        <input type="email" id="email" name="email">
      </div>

      <div class="form-field">
        <label for="living">お住まいの状況</label>
        <select id="living" name="living">
          <option value="alone">一人暮らし</option>
          <option value="family">家族と同居</option>
          <option value="other">その他</option>
        </select>
      </div>

      <div class="form-field">
        <label for="cat_status">現在の猫の飼育状況</label>
        <select id="cat_status" name="cat_status">
          <option value="none">飼っていない（新たに迎えたい）</option>
          <option value="have">すでに猫を飼っている</option>
        </select>
      </div>

      <div class="form-field">
        <label for="inquiry_type">ご相談内容<span class="required">必須</span></label>
        <select id="inquiry_type" name="inquiry_type" required>
          <option value="new">新しく猫を迎えたい</option>
          <option value="support">今の猫のお世話について相談したい</option>
          <option value="plan">料金・プランについて聞きたい</option>
          <option value="other">その他</option>
        </select>
      </div>

      <div class="form-field">
        <label for="message">ご相談内容の詳細</label>
        <textarea id="message" name="message" placeholder="ご不安なこと、ご質問など、どんなことでもお気軽にお書きください。"></textarea>
      </div>

      <div class="form-field">
        <label>
          <input type="checkbox" required style="width:auto;display:inline-block;margin-right:8px;">
          サービス内容・料金・お支払い方法を確認しました
        </label>
      </div>

      <p style="text-align:center;">
        <button type="submit" class="btn">送信する</button>
      </p>
    </form>
  </div>
</section>

<?php get_footer(); ?>
