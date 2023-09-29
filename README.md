# Ultri Open Platform
An extensible web devlopment platform with integrated Fediverse support.

## Building Blocks

* GoToSocial Fediverse server
* Elk Mastodon client
* Quasar / Vue3 frontend
* Fastify API
* SuperTokens auth
* Postgres database
* File System Access API

## API 

The API services support site multi-tenancy by using a separate Postgres database and S3 Object store for each site.
The database schema names and object store directory structure are the same for each. Each site maps host names to the various services.

### Platform Services

* Sign up / Sign In
* Fediverse account creation 
* Fediverse server
* Fediverse client
* API Server
* Password security
* Managed terms and policies
* Local Workspaces

## Front End User Interfaces

The frontend sites share stores, composables and components. It is easy for the logic to be reused, while maintaining a separate look and feel.


## Examples

It is used to power both Ultri.com and Izzup.com.
