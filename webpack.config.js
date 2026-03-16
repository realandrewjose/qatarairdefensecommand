import path from 'path';
import { fileURLToPath } from 'url';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default (env, argv) => {
    const isProd = argv?.mode === 'production';

    return {
        entry: './src/main.js',

        output: {
            path:       path.resolve(__dirname, 'dist'),
            filename:   isProd ? 'bundle.[contenthash:8].js' : 'bundle.js',
            clean:      true,
            publicPath: './',
        },

        mode:    isProd ? 'production' : 'development',
        devtool: isProd ? 'source-map' : 'eval-source-map',

        // webpack-dev-server replaces `python -m http.server 8000`
        devServer: {
            port:   8000,
            hot:    true,
            open:   true,
            static: path.resolve(__dirname, 'dist'),
        },

        plugins: [
            // Processes index.html and injects the bundle <script> tag
            new HtmlWebpackPlugin({
                template:      './index.html',
                filename:      'index.html',
                inject:        'body',
                scriptLoading: 'defer',
            }),

            // Copy static assets as-is into dist/
            new CopyWebpackPlugin({
                patterns: [
                    { from: 'assets', to: 'assets' },
                    { from: 'styles', to: 'styles' },
                ],
            }),
        ],

        performance: {
            hints:             isProd ? 'warning' : false,
            maxAssetSize:      8 * 1024 * 1024,
            maxEntrypointSize: 8 * 1024 * 1024,
        },
    };
};
