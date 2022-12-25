import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Country } from 'src/app/common/country';
import { State } from 'src/app/common/state';
import { EcommerceFormService } from 'src/app/services/ecommerce-form.service';

@Component({
  selector: 'app-checkout',
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.css']
})
export class CheckoutComponent implements OnInit {


  checkoutFormGroup: FormGroup = <FormGroup> {};

  totalPrice: number = 0;
  totalQuantity: number = 0;

  creaditCardYears: number[] = [];
  creditCardMonths: number[] = [];

  countries: Country[] = [];

  shippingAddressStates: State[] = [];
  billingAddressStates: State[] = [];


  constructor(private formBuilder: FormBuilder,
              private ecommerceFormService: EcommerceFormService) { }

  ngOnInit(): void {
    this.checkoutFormGroup = this.formBuilder.group({
      customer: this.formBuilder.group({
        firstName:[''],
        lastName: [''],
        email: ['']
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
        cardType: [''],
        nameOnCard: [''],
        cardNumber: [''],
        securityCode: [''],
        expirationMonth: [''],
        expirationYear: ['']
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
