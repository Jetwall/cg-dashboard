describe('CloudFoundry Service Tests', function() {

    var $cloudfoundry, httpBackend;

    beforeEach(module('cfdeck'));
    beforeEach(inject(function(_$cloudfoundry_, $httpBackend) {
        $cloudfoundry = _$cloudfoundry_;
        httpBackend = $httpBackend;
    }));

    afterEach(function() {
        httpBackend.verifyNoOutstandingExpectation();
        httpBackend.verifyNoOutstandingRequest();
    });


    describe('getAuthStatus', function() {

        describe('Authenticated', function() {

            it('should get the current auth status from the backend when authenticated', function() {
                httpBackend.whenGET('/v2/authstatus').respond({
                    status: 'authenticated'
                })
                $cloudfoundry.getAuthStatus().then(function(status) {
                    expect(status).toEqual('authenticated');
                });
                httpBackend.flush();
            });
        });

        describe('getAuthStatus: Forbidden', function() {

            it('should get the current auth status from the backend when not authenticated', function() {
                httpBackend.whenGET('/v2/authstatus').respond(401, {
                    'status': 'unathorized'
                })
                $cloudfoundry.getAuthStatus().then(function(status) {
                    expect(status).toEqual('unathorized');
                });
                httpBackend.flush();
            });
        });
    });

    describe('getOrgs', function() {

        it('should return only the organizations\' array from the /v2/organization endpoint', function() {

            httpBackend.whenGET('/v2/organizations').respond({
                pages: 1,
                resources: [{
                    name: 'org1'
                }, {
                    name: 'org2'
                }]
            });
            $cloudfoundry.getOrgs().then(function(orgs) {
                expect(orgs).toEqual(
                    [{
                        name: 'org1'
                    }, {
                        name: 'org2'
                    }])
            });
            httpBackend.flush();
        });

        it('should return user to home page if call fails', function() {

            httpBackend.whenGET('/v2/organizations').respond(401, {
                'status': 'unathorized'
            });
            $cloudfoundry.getOrgs().then(function(orgs) {
                expect(orgs).toEqual({
                    status: 'unauthorized'
                });
            });
            httpBackend.flush();
        });

    });

    describe('getOrgSpaceDetails', function() {

        it('should return space details with the org_name appended to the return array', function() {

            var single_org = {
                entity: {
                    name: 'org1',
                    spaces_url: '/v2/organization/123/spaces'
                }
            }
            httpBackend.whenGET(single_org.entity.spaces_url).respond({
                resources: ['mockspace1', 'mockspace2']
            });
            $cloudfoundry.getOrgSpaceDetails(single_org).then(function(data) {
                expect(data.org_name).toEqual('org1');
                expect(data.resources).toEqual(['mockspace1', 'mockspace2']);
            });
            httpBackend.flush();
        });
    });

    describe('getOrgDetails', function() {

        it('should return summary data for a specific org', function() {
            var orgSummary = {
                name: 'sandbox',
                spaces: [{
                    name: 'space1'
                }, {
                    name: 'space2'
                }]
            };
            httpBackend.whenGET('/v2/organizations/mockguid/summary').respond(orgSummary);
            $cloudfoundry.getOrgDetails('mockguid').then(function(data) {
                expect(data.name).toEqual('sandbox');
                expect(data.spaces.length).toEqual(2);
            });
            httpBackend.flush();
        });

    });

    describe('getOrgsData', function() {

        it('should return org data when `orgs` is undefined', function() {

            // Setting up mock response
            httpBackend.whenGET('/v2/organizations').respond({
                pages: 1,
                resources: [{
                    name: 'org1'
                }, {
                    name: 'org2'
                }]
            });

            var callbackSpy = function(data) {
                expect(data.length).toEqual(2);
                describe('When new data is inserted into the $cloudfoundry ctrl', function() {
                    data.push({
                        name: 'spyOrg'
                    });
                    $cloudfoundry.setOrgsData(data);
                    $cloudfoundry.getOrgsData(function(storedData) {
                        expect(storedData.length).toEqual(3);
                    });
                });
            }
            $cloudfoundry.getOrgsData(callbackSpy);
            httpBackend.flush();

        });
    });

    describe('getSpaceDetails', function() {

        it('should return space details when given a spaceGuid', function() {
            var spaceSummary = {
                name: 'spacename',
                apps: [{
                    name: 'app1'
                }, {
                    name: 'app2'
                }]
            };
            httpBackend.whenGET('/v2/spaces/spaceguid/summary').respond(spaceSummary);
            $cloudfoundry.getSpaceDetails('spaceguid').then(function(data) {
                expect(data.name).toEqual('spacename');
                expect(data.apps.length).toEqual(2);
            });
            httpBackend.flush();
        });
    });

    describe('getOrgServices', function() {
        it('should return all the services the user has access to', function() {
            var services = {
                name: 'all',
                resources: [{
                    name: 'service1'
                }, {
                    name: 'service2'
                }]
            };
            httpBackend.whenGET('/v2/organizations/testorgguid/services').respond(services);
            $cloudfoundry.getOrgServices('testorgguid').then(function(services) {
                expect(services.length).toEqual(2);
            });
            httpBackend.flush();
        });
    })

    describe('findActiveOrg', function() {
        it('should find the active org given an org guid', function() {
            // Setting up mock response
            httpBackend.whenGET('/v2/organizations').respond({
                pages: 1,
                resources: [{
                    metadata: {
                        guid: 'org1'
                    }
                }, {
                    metadata: {
                        guid: 'org2'
                    }
                }]
            });

            // Callback spy to check if the method can get the org when the org data exists 
            var getActiveOrgSpyExists = function(org) {
                    expect(org.metadata.guid).toEqual('org2');
                }
                // Now that orgs have been set check if the function can find another org
                // Callback spy to check if the method can get the org when the org data isn't there 
            var getActiveOrgSpyNew = function(org) {
                expect(org.metadata.guid).toEqual('org1');
                // Now that orgs have been set check if the function can find another org
                $cloudfoundry.findActiveOrg('org2', getActiveOrgSpyExists);
            };
            $cloudfoundry.findActiveOrg('org1', getActiveOrgSpyNew);
            httpBackend.flush();
        });
    });

    describe('getServiceDetails', function() {
        it('should collect a specific service\'s details', function() {

            httpBackend.whenGET('/v2/services/serviceguid').respond({});
            $cloudfoundry.getServiceDetails('serviceguid').then(function(data) {
                expect(data).toEqual({});
            });
            httpBackend.flush();
        });
    });

    describe('getServicePlans', function() {
        it('should collect a specific service\'s plans but not break when there are no plans', function() {

            httpBackend.whenGET('/v2/services/serviceguid/service_plans').respond({
                resources: []
            });
            $cloudfoundry.getServicePlans('/v2/services/serviceguid/service_plans').then(function(data) {
                expect(data).toEqual([]);
            });
            httpBackend.flush();
        });
        it('should collect a specific service\'s plans and not break when there is no extra', function() {

            httpBackend.whenGET('/v2/services/serviceguid/service_plans').respond({
                resources: [{
                    entity: 'other data'
                }]
            });
            $cloudfoundry.getServicePlans('/v2/services/serviceguid/service_plans').then(function(data) {
                expect(data).toEqual([{
                    entity: 'other data'
                }]);
            });
            httpBackend.flush();
        });
        it('should collect a specific service\'s plans and covert extra to json', function() {

            httpBackend.whenGET('/v2/services/serviceguid/service_plans').respond({
                resources: [{
                    entity: {
                        extra: '{"costs": 1}'
                    }
                }]
            });
            $cloudfoundry.getServicePlans('/v2/services/serviceguid/service_plans').then(function(data) {
                expect(data[0].entity.extra).toEqual({ costs: 1 });
            });
            httpBackend.flush();
        });
    });

});
