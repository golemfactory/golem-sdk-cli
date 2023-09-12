![Logo of the project](https://raw.githubusercontent.com/jehna/readme-best-practices/master/sample-logo.png)

# Golem SDK CLI

Golem SDK CLI is a companion tool for the [Golem SDK](https://github.com/golemfactory/golem-js). It allows you to create and manage Golem JS projects.


## Installing / Getting started

Golem SDK CLI is available as a NPM package.

Install using npm:
```shell
npm install -g @golem-sdk/cli
```

Install using yarn:
```shell
yarn global add @golem-sdk/cli
```

To check if the installation was successful, run:
```shell
golem-sdk --version
```

After installation the CLI is ready to be used.

## Developing

If you want to install from source code or you would like to develop Golem SDK CLI, you can clone the repository and install dependencies:

```shell
git clone git@github.com:golemfactory/golem-sdk-cli.git
cd golem-sdk-cli/
npm install
```

### Building

To build the CLI, run:
```shell
npm run build
```

To make the CLI available in your system, run:
```shell
npm link
```

Now `golem-sdk` command should be available in your system.


## Features

Golem SDK CLI is a companion tool for the [Golem SDK](https://github.com/golemfactory/golem-js). As such, it is being
developed in parallel with the SDK and new features will be added as the SDK evolves or new use-cases are identified.

If you see a feature missing, or a possible quality of life improvement we could implement, please open an issue or a pull request.


### Golem Manifest

Golem Manifest is a JSON document that describes your Golem application. While it is not required for simple applications,
you will need it if you want to access advanced features of the Golem SDK.

Whenever `golem-sdk` CLI needs to access the manifest file, by default it will look for `manifest.json`. If you want to use a different file, you can do that by using `--manifest` (or `-m`) option.


### Creating a Golem Manifest

To create a new Golem Manifest with `golem-sdk` CLI, run:

```shell
golem-sdk manifest create <image>
```

If you have a `package.json` file in your project, it will be used to fill in the `name`, `version` and `description` fields of the manifest. Otherwise you wiil need to provide them manually.

Provided `image` argument should identify the GVMI image that will be used by your application.


#### Image

The manifest needs to contain the image URL pointing to GVMI download location and it's hash to validate its integrity.
In order to facilitate the process of creating a manifest, `golem-sdk` accepts multiple forms of image argument, where some of them will automatically resolve the URL and/or hash.
Please consult the table bellow for more details:

| Argument                           | `--image-hash`               | Example                                                                                       | Notes                                                                                             |
|------------------------------------|------------------------------|-----------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------|
| Image tag                          | automatically resolved       | `golem/node:latest`                                                                           | Image hash will be fetched from [https://registry.golem.network]. This is the recommended method. |
| Image hash                         | resolved from image argument | `3d6c48bb4c192708168d53cee4f36876b263b7745c3a3c239c6749cd`                                    | Image URL will point to [https://registry.golem.network]                                          |
| URL to registry.golem.network      | automatically resolved       | `https://registry.golem.network/v1/image/download?tag=golem-examples/blender:2.80&https=true` |                                                                                                   |
| URL to arbitrary download location | hash is needed               | `https://example.com/my-image`                                                                |                                                                                                   |

If hash is not provided or resolved, you will get a warning that the manifest will not be usable until you provide it manually.


### Adding outbound URLs

In order to be able to access the internet from Golem network, your application needs to declare the outbound URLs it will be using inside its manifest.

There is a default set of URLs that providers may allow your application to use (TODO: link to default URL whitelist).
In order to use URLs from outside of this whitelist, you need to provide a signed manifest that can be validated by certificates issued by Golem.

**NOTE:** Currently there is no process for obtaining the certificate needed to validate the manifest signature. Please contact us on discord if you need to use URLs outside the default whitelist.

You can use this command multiple times to update URLs in the manifest, and you can pass multiple URLs at once.


#### Example: Simple use

This command will update the manifest file with the URL.

```shell
golem-sdk manifest net add-outbound https://golem.network
```


#### Example: Multiple URLs

This command will update the manifest file with all the URLs provided.

```shell
golem-sdk manifest net add-outbound https://golem.network https://github.com https://example.com
```

### Signing the manifest

In order to use URLs outside the default whitelist, you need to sign the manifest with a key provided by Golem.

**NOTE:** Currently there is no process for obtaining the certificate needed to validate the manifest signature. Please contact us on discord if you need to use URLs outside the default whitelist.

If your private key is encrypted, you will need to provide the correct passphrase (`-p` or `--passphrase` option).

To sign the manifest, run:
```shell
golem-sdk manifest sign -k <private-key>
```

This command will produce a signature file (by default `manifest.sig`) that you will need to use in your application.


### Verifying the signature

You can verify manifest signature with your certificate using the following command:

```shell 
golem-sdk manifest verify
```

By default, it will use `manifest.pem` as the certificate file and `manifest.sig` as the signature file. You can change that by using `--certificate-file` and `--signature-file` options.

On success, it will print the following message:

```
Manifest matches signature.
```

It is important to use this command to make sure the key you are using is compatible with your certificate.


## Contributing

If you'd like to contribute to the project, you can fork the repository and create a Pull Request.
Code contribution are warmly welcomed.

Please make sure the code follows coding style as configured in `.eslintrc` and `.prettierrc`.

The Pull Request should describe what changes you've made, what's the purpose of them and how to use them.


## Links

- Project homepage: https://github.com/golemfactory/golem-sdk-cli
- Repository: https://github.com/golemfactory/golem-sdk-cli
- Issue tracker: https://github.com/golemfactory/golem-sdk-cli/issues
    - In case of sensitive bugs like security vulnerabilities, please contact
      my@email.com directly instead of using issue tracker. We value your effort
      to improve the security and privacy of this project!
- [Golem](https://golem.network), a global, open-source, decentralized supercomputer that anyone can access.
- [Golem Image Registry](https://registry.golem.network)
- [Golem Discord](https://discord.gg/golem)
- Documentation:
    - [Quick start](https://docs.golem.network/creators/javascript/quickstart/) for JavaScript developers
    - Have a look at the most important concepts behind any Golem
      application: [Golem application fundamentals](https://handbook.golem.network/requestor-tutorials/golem-application-fundamentals)
    - Learn about preparing your own Docker-like images for
      the [VM runtime](https://handbook.golem.network/requestor-tutorials/vm-runtime)
    - [Requestor development: a quick primer](https://handbook.golem.network/requestor-tutorials/flash-tutorial-of-requestor-development)
- Related projects:
    - [Golem SDK](https://github.com/golemfactory/golem-js) - Typescript + NodeJS API for Golem.
    - [Yagna](https://github.com/golemfactory/yagna) - An open platform and marketplace for distributed computations.
    - [yapapi](https://github.com/golemfactory/yapapi) - Python high-level API for Golem.


## Licensing

The code in this project is licensed under LGPL-3 license.

See [LICENSE](LICENSE) for more information.
