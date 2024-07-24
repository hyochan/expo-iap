package expo.modules.iap

import expo.modules.kotlin.exception.CodedException

class MissingCurrentActivityException :
    CodedException("Activity which was provided during module initialization is no longer available")
