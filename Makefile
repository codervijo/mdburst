PROJ := mdburst.com

.DEFAULT_GOAL := help

# Verify parent Makefile exists — this project is part of the sites/ workspace.
ifeq ($(wildcard ../Makefile),)
$(error This Makefile is meant to be run inside the sites/ workspace. Parent Makefile not found.)
endif

# Forward every target to the parent Makefile with proj set to this project.
# `make buildsh` (parent) drops you into the dev container; `make run` etc.
# delegate to the central builder repo (~/work/projects/builder/) under the hood.
%:
	$(MAKE) -C .. $@ proj=$(PROJ)
