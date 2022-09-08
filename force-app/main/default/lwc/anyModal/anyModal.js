/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { LightningElement, api, wire } from 'lwc';
import basePath from '@salesforce/community/basePath';

/**
 * @slot triggerRegion
 * @slot headerRegion
 * @slot contentRegion
 * @slot footerRegion
 */
export default class AnyModal extends LightningElement {
    isAura = false;
    isPreview = false;
    @api editMode;
    @api displayRegions;
    @api size;
    @api referenceKey;
    @api referenceOpen;
    @api referenceClose;
    @api actionAfterClose;
    @api actionAfterCloseParam;
    @api triggerType;
    @api triggerThreshold;
    @api cookieName;
    @api cookieExpiration;
    @api borderRadius = '.25rem';
    @api sectionSeparatorSize = '2px';
    @api headerSpacing = '1rem';
    @api contentSpacing = '1rem';
    @api footerSpacing = '1rem';
    @api triggerRegionClassNames;
    @api modalRegionClassNames;
    showModal = false;
    modalWasDisplayed = false;
    openListener;
    closeListener;
    keydownListener;
    triggerEvent;
    triggerListener;

    connectedCallback() {
        if (window['$A'] !== undefined && window['$A'] !== null) {
            this.isAura = true;
        } else {
            let style = this.template.host.style;
            if (!this.displayHeader) {
                style.setProperty('--anyModal-content-top-radius-border', this.borderRadius);
            }
            if (!this.displayFooter) {
                style.setProperty('--anyModal-content-bottom-radius-border', this.borderRadius);
            }
            style.setProperty('--slds-c-modal-radius-border', this.borderRadius);
            style.setProperty('--slds-c-modal-sizing-border', this.sectionSeparatorSize);
            style.setProperty('--slds-c-modal-header-spacing-block-start', this.headerSpacing);
            style.setProperty('--slds-c-modal-header-spacing-block-end', this.headerSpacing);
            style.setProperty('--slds-c-modal-header-spacing-inline-start', this.headerSpacing);
            style.setProperty('--slds-c-modal-header-spacing-inline-end', this.headerSpacing);
            style.setProperty('--slds-c-modal-footer-spacing-block-start', this.footerSpacing);
            style.setProperty('--slds-c-modal-footer-spacing-block-end', this.footerSpacing);
            style.setProperty('--slds-c-modal-footer-spacing-inline-start', this.footerSpacing);
            style.setProperty('--slds-c-modal-footer-spacing-inline-end', this.footerSpacing);
            style.setProperty('--anyModal-content-spacing', this.contentSpacing);
            
            let context = this;
            this.isPreview = this.isInSitePreview();
            this.showModal = this.isEditPreview;

            this.openListener = function(e) {
                if (context.customEventValid(e, context)) {
                    context.handleOpen();
                }
            }
            document.addEventListener('anyModal:open', this.openListener);
            
            this.closeListener = function(e) {
                if (context.customEventValid(e, context)) {
                    context.handleClose();
                }
            }
            document.addEventListener('anyModal:close', this.closeListener);
            
            this.keydownListener = function(e) {
                if (e.key == "Escape") {
                    context.handleClose();
                }
            }
            document.addEventListener('keydown', this.keydownListener);

            if (this.cookieName) {
                let cookieValue = this.getCookie(this.cookieName);
                if (cookieValue != null) {
                    return;
                }
                if (this.triggerType === 'After x Seconds') {
                    setTimeout(function() { 
                        context.handleOpen(context); 
                    }, context.triggerThreshold * 1000);
                } else if (this.triggerType === 'Page Scroll x Percent') {
                    this.triggerEvent = 'scroll';
                    this.triggerListener = function(e) {
                        let scrollHeight = document.body.scrollHeight;
                        let currentHeight = window.pageYOffset + document.body.clientHeight;
                        let percent = currentHeight/scrollHeight * 100;
                        if (!context.modalWasDisplayed && percent >= context.triggerThreshold) {
                            context.handleOpen(context);
                        }
                    }
                    document.addEventListener(this.triggerEvent, this.triggerListener);
                } else if (this.triggerType === 'After x Clicks') {
                    let numberOfClicks = 0;
                    this.triggerEvent = 'click';
                    this.triggerListener = function(e) {
                        numberOfClicks++;
                        if (!context.modalWasDisplayed && numberOfClicks >= context.triggerThreshold) {
                            context.handleOpen(context);
                        }
                    }
                    document.addEventListener(this.triggerEvent, this.triggerListener);
                } else if (this.triggerType === 'Exit Intent After x Seconds') {
                    setTimeout(function() { 
                        context.triggerEvent = 'mouseout';
                        context.triggerListener = function(e) {
                            let shouldShowExitIntent = !e.toElement && !e.relatedTarget && e.clientY < 10;
                            if (!context.modalWasDisplayed && shouldShowExitIntent) {
                                context.handleOpen(context);
                            }
                        }
                        document.addEventListener(context.triggerEvent, context.triggerListener);
                    }, context.triggerThreshold * 1000);
                }
            }
        }
    }

    disconnectedCallback() {
        document.removeEventListener('anyModal:open', this.openListener);
        document.removeEventListener('anyModal:close', this.closeListener);
        document.removeEventListener('keydown', this.keydownListener);
        if (this.triggerEvent) {
            document.removeEventListener(this.triggerEvent, this.triggerListener);
        }
    }

    customEventValid(e, context) {
        if (e.detail && e.detail.hasOwnProperty('referenceKey')) {
            let payload = e.detail;
            if (payload.referenceKey === context.referenceKey) {
                //useCookie should only optionally be supplied with the open event and not used with the close event
                if (payload.hasOwnProperty('useCookie') && payload.useCookie) {
                    let cookieValue = context.getCookie(context.cookieName);
                    if (cookieValue == null) {
                        return true;
                    }
                } else {
                    return true;
                }
            }
        } else {
            return true;
        }
        return false;
    }

    getCookie(name) {
        var nameEQ = name + "=";
        var ca = document.cookie.split(';');
        for(var i=0;i < ca.length;i++) {
            var c = ca[i];
            while (c.charAt(0)==' ') c = c.substring(1,c.length);
            if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
        }
        return null;
    }

    handleTriggerRegion(evt) {
        if (this.isValidRegionClick(this.referenceOpen, evt)) {
            this.handleOpen();
        }
    }

    handleModalRegion(evt) {
        if (this.isValidRegionClick(this.referenceClose, evt)) {
            this.handleClose();
        }
    }

    isValidRegionClick(referenceText, evt) {
        let target = evt.target;

        if (target.tagName === 'DXP_FLOWRUNTIME-NAVIGATION-BAR') {
            let button = evt.composedPath()[2];
            if (button.className.indexOf('flow-button__FINISH') > 0) {
                return true;
            }
        }
        
        if (referenceText) {
            if (referenceText === target.text) {
                return true;
            } else if (target.className.indexOf(referenceText) > 0) {
                return true;
            }
        } else if (target.tagName === 'A' || target.tagName === 'BUTTON' || target.tagName === 'LIGHTNING-BUTTON') {
            return true;
        }
        return false;
    }

    handleOpen(context) {
        if (!context) {
            context = this;
        }
        if (context.isEditPreview) {
            return;
        }
        context.showModal = true;
        context.modalWasDisplayed = true;
        if (context.cookieName) {
            document.cookie = context.cookieName + '=true;path=/;max-age=' + context.cookieExpiration * 3600;
        }
    }

    handleClose() {
        if (!this.isEditPreview) {
            this.showModal = false;
            if (this.actionAfterClose === 'Reload Page') {
                history.go(); //used in place of location.reload() in LWR
            } else if (this.actionAfterClose === 'Navigate to URL') {
                let anchor = document.createElement('a');
                anchor.setAttribute('href',this.actionAfterCloseParam);
                anchor.click(); //used in place of location.href in LWR
            }
            document.dispatchEvent(new CustomEvent('anyModal:handleAfterClose',{detail:{referenceKey:this.referenceKey}}));
        }
    }

    get displayHeader() {
        return this.displayRegions !== 'Body and Footer' && this.displayRegions !== 'Body-Only';
    }

    get displayFooter() {
        return this.displayRegions !== 'Header and Body' && this.displayRegions !== 'Body-Only';
    }

    get displayBackdrop() {
        return this.showModal && !this.isEditPreview;
    }

    get modalClass() {
        let classNames = 'slds-modal  slds-modal_' + this.size + ' slds-fade-in-open';
        if (this.modalRegionClassNames) {
            classNames += ' ' + this.modalRegionClassNames;
        }
        return classNames;
    }

    get isEditPreview() {
        return this.editMode && this.isPreview;
    }

    get triggerStyle() {
        if (this.isPreview) {
            return 'padding-top: 5px;padding-bottom: 5px;';
        } else {
            return '';
        } 
    }

    get modalStyle() {
        if (this.isEditPreview) {
            return 'position: relative; background: rgba(8,7,7,.2);';
        } else {
            return '';
        } 
    }

    get containerStyle() {
        if (this.isEditPreview) {
            return 'min-width: unset;';
        } else {
            return '';
        } 
    }

    get iconUrl() {
        return basePath +'/assets/icons/utility-sprite/svg/symbols.svg#close';
    }

    isInSitePreview() {
        let url = document.URL;
        
        return (url.indexOf('sitepreview') > 0 
            || url.indexOf('livepreview') > 0
            || url.indexOf('live-preview') > 0 
            || url.indexOf('live.') > 0
            || url.indexOf('.builder.') > 0);
    }
}