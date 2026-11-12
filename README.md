This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Googleマップのルート検索設定

ルート候補と有料道路料金の目安を取得するため、Google Maps Routes APIを使用します。
Google CloudプロジェクトでRoutes APIと課金を有効にしたうえで、APIキーをサーバー側の環境変数として設定してください。
環境変数名に`NEXT_PUBLIC_`を付けないでください。

```text
GOOGLE_MAPS_API_KEY=your_server_api_key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_browser_api_key
```

ローカル開発では、プロジェクトのルートにある`.env.local`に以下の2つのキーを設定します。
`GOOGLE_MAPS_API_KEY`はRoutes API専用のサーバーキーにし、ブラウザー用キーと分けてください。
`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`には、Google Maps JavaScript APIを有効にしたブラウザー用キーを設定します。
ブラウザー用キーは公開されるため、Google CloudでHTTPリファラー制限を設定し、利用可能なAPIもMaps JavaScript APIに制限してください。
本番環境では、デプロイ先に両方の環境変数を登録してください。サーバー用APIキーはブラウザーには送信されません。
ルートによっては有料道路料金の目安を取得できない場合があります。

## ルート検索の使い方

出発地・目的地に住所や地名を入力するか、ブラウザーの位置情報を許可して現在地を出発地に設定できます。「地図上のピンの位置を使用する」を選ぶと、地図をクリックした地点を出発地・目的地・経由地に指定できます。地図では拡大・縮小やドラッグもできます。

経由地、有料道路の回避、高速道路の回避、ETCまたはETC2.0の使用条件を設定してからルートを検索してください。回避設定は可能な範囲でルートを選ぶ指定であり、必ず回避できるとは限りません。ETC料金はGoogle Maps Routes APIが提供する目安で、ルートによっては料金が取得できない場合があります。位置情報の利用にはブラウザーの許可が必要です。

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
