import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Route, Router } from '@angular/router';
import { Country } from 'src/app/common/country';
import { Order } from 'src/app/common/order';
import { OrderItem } from 'src/app/common/order-item';
import { PaymentInfo } from 'src/app/common/payment-info';
import { Purchase } from 'src/app/common/purchase';
import { State } from 'src/app/common/state';
import { CartService } from 'src/app/services/cart.service';
import { CheckoutService } from 'src/app/services/checkout.service';
import { EcommerceFormService } from 'src/app/services/ecommerce-form.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-checkout',
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.css']
})
export class CheckoutComponent implements OnInit {

  finalPurchase!: Purchase;
  checkoutFormGroup!: FormGroup;

  totalPrice: number = 0;
  totalQuantity: number = 0;

  creaditCardYears: number[] = [];
  creditCardMonths: number[] = [];

  countries: Country[] = [];

  shippingAddressStates: State[] = [];
  billingAddressStates: State[] = [];

  stripe = Stripe(environment.stripePublishableKey);

  paymentInfo: PaymentInfo = new PaymentInfo();
  cardELement: any ;
  displayError: any = "";

  constructor(private formBuilder: FormBuilder,
              private ecommerceFormService: EcommerceFormService,
              private cartService: CartService,
              private checkoutService: CheckoutService,
              private router: Router) { }

  ngOnInit(): void {

    this.setupStripePaymentForm();

    this.reviewCartDetails();
    
    this.checkoutFormGroup = this.formBuilder.group({
      customer: this.formBuilder.group({
        firstName: new FormControl('',[Validators.required,Validators.minLength(2)]),
        lastName: new FormControl('',[Validators.required,Validators.minLength(2)]),
        email: new FormControl('',
                              [Validators.required, Validators.pattern('^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,4}$')])
      }),
      shippingAddress: this.formBuilder.group({
        street: [''],
        city: [''],
        state: [''],
        country: [''],
        zipCode: ['']
      }),
      billingAddress: this.formBuilder.group({
        street: [''],
        city: [''],
        state: [''],
        country: [''],
        zipCode: ['']
      }),
      creditCard: this.formBuilder.group({
        // cardType: [''],
        // nameOnCard: [''],
        // cardNumber: [''],
        // securityCode: [''],
        // expirationMonth: [''],
        // expirationYear: ['']
      })
    });

    const startMonth: number = new Date().getMonth() +1;

    this.ecommerceFormService.getCreditCardMonths(startMonth).subscribe(
      data => {
        this.creditCardMonths = data;
      }
    );

    this.ecommerceFormService.getCreditCardYears().subscribe(
      data => {
        this.creaditCardYears = data;
      }
    );

    this.ecommerceFormService.getCountries().subscribe(
      data => {
        this.countries = data;
      }
    );


  }

  setupStripePaymentForm() {
    
    var elemets = this.stripe.elements();

    this.cardELement = elemets.create('card', { hidePostalCode: true});

    this.cardELement.mount('#card-element');

    this.cardELement.on('change', (event:any) => {
      this.displayError = document.getElementById('card-errors');

      if(event.complete){
        this.displayError.textContext="";
      } else if(event.error){
        this.displayError.textContext=event.error.message;
      }
    });

  }

  reviewCartDetails(){

    this.cartService.totalQuantity.subscribe(
     totalQuantity => this.totalQuantity = totalQuantity
    );

    this.cartService.totalPrice.subscribe(
      totalPrice => this.totalPrice = totalPrice
     );

  }

  get firstName(){
    return this.checkoutFormGroup.get('customer.firstName');
  }

  get lastName(){
    return this.checkoutFormGroup.get('customer.lastName');
  }

  get email(){
    return this.checkoutFormGroup.get('customer.email');
  }

  copyShippingAddressToBillingAddress(event: any) {
    if(event.target.checked){
      this.checkoutFormGroup.controls['billingAddress']
      .setValue(this.checkoutFormGroup.controls['shippingAddress'].value);

      this.billingAddressStates = this.shippingAddressStates;
    }
    else {
      this.checkoutFormGroup.controls['billingAddress'].reset();

      this.billingAddressStates = [];

    }
    }

    handleMonthsAndYears(){
      const creditCardFormGroup = this.checkoutFormGroup.get('creditCard');

      const currentYear: number = new Date().getFullYear();
      const selectedYear: number = Number(creditCardFormGroup?.value.expirationYear);

      let startMonth: number;

      if(currentYear === selectedYear){
        startMonth = new Date().getMonth() + 1;
      
      }
      else {
        startMonth = 1;
      }

      this.ecommerceFormService.getCreditCardMonths(startMonth).subscribe(
        data => {
          this.creditCardMonths = data;
        }
      )
    }

  onSubmit(){

    if(this.checkoutFormGroup.invalid){
      this.checkoutFormGroup.markAllAsTouched();
      return;
    }

    let order = new Order();
    order.totalPrice = this.totalPrice;
    order.totalQuantity = this.totalQuantity;

    const cartItems = this.cartService.cartItems;

    let orderItems: OrderItem[] = cartItems.map(tempCartItem => new OrderItem(tempCartItem));

    let purchase = new Purchase();

    purchase.customer = this.checkoutFormGroup.controls['customer'].value;
    
    purchase.shippingAddress = this.checkoutFormGroup.controls['shippingAddress'].value;
    const shippingState: State = JSON.parse(JSON.stringify(purchase.shippingAddress.state));
    const shippingCountry: State = JSON.parse(JSON.stringify(purchase.shippingAddress.country));
    purchase.shippingAddress.state = shippingState.name;
    purchase.shippingAddress.country = shippingCountry.name;

    purchase.billingAddress = this.checkoutFormGroup.controls['billingAddress'].value;
    const billingState: State = JSON.parse(JSON.stringify(purchase.billingAddress.state));
    const billingCountry: State = JSON.parse(JSON.stringify(purchase.billingAddress.country));
    purchase.billingAddress.state = billingState.name;
    purchase.billingAddress.country = billingCountry.name;

    purchase.order = order;
    purchase.orderItems = orderItems;

    this.finalPurchase = purchase;
    console.log("final purchase is " + JSON.stringify(this.finalPurchase));

    this.paymentInfo.amount = Math.round(this.totalPrice * 100);
    this.paymentInfo.currency = "USD";

    if (!this.checkoutFormGroup.invalid && this.displayError.textContent === "") {

      this.checkoutService.createPaymentIntent(this.paymentInfo).subscribe(
        (paymentIntentResponse) => {
          this.stripe.confirmCardPayment(paymentIntentResponse.client_secret,
            {
              payment_method: {
                card: this.cardELement
              }
            }, { handleActions: false })
          .then((result: any) => {
            if (result.error) {
              // inform the customer there was an error
              alert(`There was an error: ${result.error.message}`);
            } else {
              // call REST API via the CheckoutService
              this.checkoutService.placeOrder(purchase).subscribe({
                next: (response: any) => {
                  alert(`Your order has been received.\nOrder tracking number: ${response.orderTrackingNumber}`);

                  // reset cart
                  this.resetCart();
                },
                error: (err: any) => {
                  alert(`There was an error: ${err.message}`);
                }
              })
            }            
          });
        }
      );
    } else {
      this.checkoutFormGroup.markAllAsTouched();
      return;
    }
      
    console.log(this.checkoutService.getRecommendations(this.finalPurchase));
  

  }

  resetCart() {
  
    this.cartService.cartItems = [];
    this.cartService.totalPrice.next(0);
    this.cartService.totalQuantity.next(0);

    this.checkoutFormGroup.reset();

    this.router.navigateByUrl("/products");

  }

  getStates(formGroupName: string){
    const formGroup = this.checkoutFormGroup.get(formGroupName);

    const countryCode = formGroup?.value.country.code;
    const countryName = formGroup?.value.country.name;

    this.ecommerceFormService.getStates(countryCode).subscribe(
      data => {
        if(formGroupName === 'shippingAddress'){
          this.shippingAddressStates = data;
        }
        else {
          this.billingAddressStates = data;
        }

        formGroup?.get('state')?.setValue(data[0]);
      }
    );

  }

}
