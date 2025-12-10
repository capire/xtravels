
This is a proxy package to run with embedded the `xflights` service, instead of separate microservices.

Use the following command to add it to your project:

```sh
npm add ./srv/xflights
```

Switch back to separate microservices by removing the proxy package and using the published API package again:

```sh
npm rm @capire/xflights-data
```
```sh
npm add @capire/xflights-data
```
