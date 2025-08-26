using { sap.capire.flights.data as external } from '@capire/xflights';

annotate external.Flights with @cds.replicate;
annotate external.Supplements with @cds.replicate.ttl: '1m';