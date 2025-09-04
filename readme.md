# @capire/xtravels

A travel booking application using master data provided by [capire/xflights](https://github.com/capire/xflights).


## Get it

```sh
git clone https://github.com/capire/xtravels
cd xtravels
npm install
```

The package has an npm dependency to [_`@capire/xflights-data`_](https://github.com/capire/xflights/pkgs/npm/xflights-data) that can be pulled from [GitHub Packages](#using-github-packages) or from a [local workspace setup](#using-workspaces) as follows...



### Using GitHub Packages

Reuse packages among the *[capire samples](https://github.com/capire)* are published to the [GitHub Packages](https://docs.github.com/packages) registry, which requires you to `npm login` once like that:

```sh
npm login --scope=@capire --registry=https://npm.pkg.github.com
```

When prompted for a password enter a Personal Access Token (classic) with `read:packages` scope.
Learn more about that in [Authenticating to GitHub Packages](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry#authenticating-to-github-packages).

A successfull `npm login` adds entries like that to your local `~/.npmrc` file, which allow you to npm install @capire packages subsequently using `npm add` or `npm install` as usual:

```properties
@capire:registry=https://npm.pkg.github.com/
//npm.pkg.github.com/:_authToken=<generated token>
```



### Using Workspaces

Alternatively you can work with related packages in local workspace setups like so:

1. Create a workspace root, e.g. at `cap/samples`:
   ```sh
   mkdir -p cap/samples && cd cap/samples
   echo '{"workspaces":["*","*/apis/*"]}' > package.json
   ```

2. Add related projects:
   ```sh
   git clone https://github.com/capire/xflights
   git clone https://github.com/capire/xtravels
   ```

3. Install dependencies:
   ```sh
   npm install
   ```

This will install all dependencies of all cloned projects, with cross dependencies between them being *symlinked* automatically by `npm install`. We can inspect this using `npm list`:

```sh
npm ls @capire/xflights-data
```

... which should display something like this:

```sh
samples@ ~/cap/samples
├── @capire/xflights-data@0.1.5 -> ./xflights/apis/data-service
└─┬ @capire/xtravels@1.0.0 -> ./xtravels
  └── @capire/xflights-data@0.1.5 deduped -> ./xflights/apis/data-service
```


## Run it

```sh
cds watch
```

Which should print something like that:

```sh
...
[cds] - server listening on { url: 'http://localhost:4004' }
[cds] - server v9.4.0 launched in 444 ms
[cds] - [ terminate with ^C ]
```

`Cmd-click` the http://localhost:4004 link in the terminal to open the app in a browser.




## License

Copyright (c) 2022 SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, version 2.0 except as noted otherwise in the [LICENSE](LICENSE) file.
