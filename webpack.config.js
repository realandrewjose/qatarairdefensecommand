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

        devServer: {
            port:   8080,   // 8080 so it doesn't clash with python on 8000
            hot:    true,
            open:   true,
            static: path.resolve(__dirname, 'dist'),
        },

        plugins: [
            new HtmlWebpackPlugin({
                template:      './index.html',
                filename:      'index.html',
                inject:        'body',
                scriptLoading: 'defer',
            }),
            new CopyWebpackPlugin({
                patterns: [
                    {
                        context: 'assets',
                        from: '**/*',
                        to: 'assets/[path][name][ext]',
                        noErrorOnMissing: true,
                        globOptions: {
                            dot: false,
                            onlyFiles: true,
                        },
                    },
                    {
                        context: 'styles',
                        from: '**/*',
                        to: 'styles/[path][name][ext]',
                        noErrorOnMissing: true,
                        globOptions: {
                            dot: false,
                            onlyFiles: true,
                        },
                    },
                ],
            }),
        ],

        performance: {
            hints:             false,
            maxAssetSize:      10 * 1024 * 1024,
            maxEntrypointSize: 10 * 1024 * 1024,
        },
    };
};
