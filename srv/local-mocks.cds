// Just for demo reasons. Allows us to run the embedded events and hotels services
// as both standalone micro services, or all-in-one with xtravels.
using { HotelsService } from './hotels/services';
using { EventsService } from './events/services';
annotate HotelsService with @cds.external:2;
annotate EventsService with @cds.external:2;
